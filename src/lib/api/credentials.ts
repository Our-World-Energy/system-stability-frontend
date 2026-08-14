/*
  Credential-manager API surface: the form's shape, the wire payload, the rules
  that connect them, and the one call that creates a record.

  The pure parts (`validateCredentialDraft`, `buildCreateCredentialPayload`) are
  kept free of network and crypto so both the modal and the tests can use them
  directly. Only `createCredential` touches the outside world, and it is the sole
  place a plaintext secret is turned into an `encrypted_secret`.
*/

import { encryptSecret } from '@/lib/crypto/secret-crypto'
import { decryptViaWorker } from '@/lib/crypto/decrypt-remote'
import { SecretCryptoError } from '@/lib/crypto/keys'
import { ApiError, stabilityCaller } from './caller'
import { endpoints } from './endpoints'
import type { ApiEnvelope } from './caller'
import type { Credential, CredentialAuditAction, CredentialAuditLogItem, Paginated } from './types'

/* ── Options ──────────────────────────────────────────────────────────────── */

/**
 * Second-factor methods, with the value the backend stores. Labels are UI-only;
 * if the service names a method differently, change `value` here and nothing
 * else moves.
 */
export const twoFactorOptions = [
  { value: 'none', label: 'None' },
  { value: 'totp', label: 'Authenticator App (TOTP)' },
  { value: 'sms', label: 'SMS / Text Message' },
  { value: 'email', label: 'Email OTP' },
  { value: 'webauthn', label: 'Hardware Security Key (FIDO2/U2F)' },
  { value: 'push', label: 'Push Notification' },
  { value: 'biometric', label: 'Biometric' },
] as const

export type TwoFactorType = (typeof twoFactorOptions)[number]['value']

export const DEFAULT_ELEVATION_SECONDS = 3600

/** Guard rails the form and the validator agree on. */
export const credentialLimits = {
  nameMaxLength: 128,
  usernameMaxLength: 128,
  notesMaxLength: 1000,
  tagMaxLength: 32,
  maxTags: 12,
} as const

/* ── Shapes ───────────────────────────────────────────────────────────────── */

/**
 * What the create form holds.
 *
 * `tags`, `elevationDurationSeconds` and `autoGrant` are part of the wire
 * contract but have no control on the form, so they ride along at the defaults
 * set in `emptyCredentialDraft`. Adding an input for any of them later is purely
 * a change in the modal — this type and the payload builder already carry them.
 */
export interface CredentialDraft {
  name: string
  username: string
  secret: string
  url: string
  /**
   * Owning platform, chosen one of two mutually exclusive ways:
   *   - a get-metadata catalog id in `platformId` (then `platformOther` is unused), or
   *   - "Other" with a free-text name in `platformOther` (then `platformId` is null).
   * Both unset (null / '') means no platform was chosen.
   */
  platformId: number | null
  platformOther: string
  /** Owning department — a get-metadata catalog id, or null when unset. */
  departmentId: number | null
  /** Marks a development-only credential. */
  isDev: boolean
  tags: string[]
  twoFactorType: TwoFactorType
  twoFactorApprover: string
  elevationDurationSeconds: number
  autoGrant: boolean
  notes: string
}

/** Exactly what goes over the wire to `credential-manager/create-credential`. */
export interface CreateCredentialPayload {
  name: string
  username: string
  /** Encrypted client-side. A plaintext value must never appear here. */
  encrypted_secret: string
  url: string
  /**
   * Platform reference: exactly one of these carries a value. A catalog pick sends
   * `platform_id` (with `platform_other` blank); "Other" sends `platform_id: null`
   * and the typed name in `platform_other`, which the backend resolves to an id.
   */
  platform_id: number | null
  platform_other: string
  /** Department reference — a catalog id, or null when unset. */
  department_id: number | null
  is_dev: boolean
  tags: string[]
  two_factor_type: TwoFactorType
  two_factor_approver: string
  elevation_duration_seconds: number
  auto_grant: boolean
  notes: string
}

/** What create and rotate hand back — the full record, minus the secret. */
export type CreatedCredential = Credential

export function emptyCredentialDraft(): CredentialDraft {
  return {
    name: '',
    username: '',
    secret: '',
    url: '',
    platformId: null,
    platformOther: '',
    departmentId: null,
    isDev: false,
    // Not on the form — see the note on CredentialDraft.
    tags: [],
    twoFactorType: 'none',
    twoFactorApprover: '',
    elevationDurationSeconds: DEFAULT_ELEVATION_SECONDS,
    autoGrant: false,
    notes: '',
  }
}

/* ── Validation ───────────────────────────────────────────────────────────── */

export type CredentialField = keyof CredentialDraft
export type CredentialErrors = Partial<Record<CredentialField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Field-level errors for a draft; an empty object means it is safe to submit.
 * Deliberately permissive about secret content — a vault holds PINs and API keys
 * as well as passwords, so a short value is accepted rather than second-guessed.
 */
export function validateCredentialDraft(draft: CredentialDraft): CredentialErrors {
  const errors: CredentialErrors = {}
  const name = draft.name.trim()

  if (!name) errors.name = 'A credential name is required.'
  else if (name.length < 2) errors.name = 'Use at least two characters.'
  else if (name.length > credentialLimits.nameMaxLength) {
    errors.name = `Keep the name under ${credentialLimits.nameMaxLength} characters.`
  }

  if (draft.username.length > credentialLimits.usernameMaxLength) {
    errors.username = `Keep the username under ${credentialLimits.usernameMaxLength} characters.`
  }

  if (!draft.secret) errors.secret = 'A secret value is required.'

  if (draft.url.trim() && !isHttpUrl(draft.url.trim())) {
    errors.url = 'Enter a full URL starting with http:// or https://'
  }

  if (draft.tags.length > credentialLimits.maxTags) {
    errors.tags = `Use at most ${credentialLimits.maxTags} tags.`
  }

  // An approver is what makes the second factor meaningful, so it is required
  // once a method is chosen — but irrelevant, and left alone, when it is "none".
  if (draft.twoFactorType !== 'none') {
    const approver = draft.twoFactorApprover.trim()
    if (!approver) errors.twoFactorApprover = 'Name the approver for this second factor.'
    else if (!EMAIL_PATTERN.test(approver)) {
      errors.twoFactorApprover = 'Enter the approver as an email address.'
    }
  }

  if (!Number.isInteger(draft.elevationDurationSeconds) || draft.elevationDurationSeconds <= 0) {
    errors.elevationDurationSeconds = 'Choose an elevation window.'
  }

  if (draft.notes.length > credentialLimits.notesMaxLength) {
    errors.notes = `Keep notes under ${credentialLimits.notesMaxLength} characters.`
  }

  return errors
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Object.keys(errors).length > 0
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Trim, lower-case and de-duplicate a tag, or return '' if nothing is left. */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().slice(0, credentialLimits.tagMaxLength)
}

/* ── Payload ──────────────────────────────────────────────────────────────── */

/**
 * Map a validated draft plus its already-encrypted secret onto the wire payload.
 * Every key is always present — the Go handler binds a fixed struct, so omitting
 * optionals is riskier than sending empty ones.
 */
export function buildCreateCredentialPayload(
  draft: CredentialDraft,
  encryptedSecret: string,
): CreateCredentialPayload {
  const usesTwoFactor = draft.twoFactorType !== 'none'
  return {
    name: draft.name.trim(),
    username: draft.username.trim(),
    encrypted_secret: encryptedSecret,
    url: draft.url.trim(),
    // Exactly one of platform_id / platform_other is populated: a catalog pick
    // blanks the free text, and "Other" nulls the id (see the field docs).
    platform_id: draft.platformId,
    platform_other: draft.platformId == null ? draft.platformOther.trim() : '',
    department_id: draft.departmentId,
    is_dev: draft.isDev,
    tags: dedupeTags(draft.tags),
    two_factor_type: draft.twoFactorType,
    two_factor_approver: usesTwoFactor ? draft.twoFactorApprover.trim() : '',
    elevation_duration_seconds: draft.elevationDurationSeconds,
    auto_grant: draft.autoGrant,
    notes: draft.notes.trim(),
  }
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  for (const tag of tags) {
    const normalized = normalizeTag(tag)
    if (normalized) seen.add(normalized)
  }
  return [...seen].slice(0, credentialLimits.maxTags)
}

/* ── Call ─────────────────────────────────────────────────────────────────── */

/**
 * Encrypt the secret, then register the credential.
 *
 * The plaintext exists only as this function's argument: it is never logged,
 * never stored, and never part of the request. Throws `SecretCryptoError` if the
 * secret cannot be encrypted and `ApiError` if the service rejects the record —
 * both carry a message that can be shown as-is.
 */
export async function createCredential(
  draft: CredentialDraft,
): Promise<ApiEnvelope<CreatedCredential>> {
  const errors = validateCredentialDraft(draft)
  if (hasErrors(errors)) {
    throw new Error(Object.values(errors)[0] ?? 'The credential details are incomplete.')
  }
  const encryptedSecret = await encryptSecret(draft.secret)
  const payload = buildCreateCredentialPayload(draft, encryptedSecret)
  return stabilityCaller<CreatedCredential>(endpoints.credentialManager.create, payload)
}

/**
 * Find active credentials whose name contains `q` (case-insensitive).
 *
 * The service rejects a blank `q` — there is no list-everything route — so an
 * empty query short-circuits to an empty list rather than a failed request.
 * Secrets are never part of the response.
 */
export async function searchCredentials(q: string): Promise<Credential[]> {
  const term = q.trim()
  if (!term) return []
  const { data } = await stabilityCaller<Credential[] | null>(endpoints.credentialManager.search, {
    q: term,
  })
  return data ?? []
}

/* ── Audit log ────────────────────────────────────────────────────────────── */

export const DEFAULT_CREDENTIAL_AUDIT_PAGE_SIZE = 50

export interface CredentialAuditLogFilters {
  page?: number
  pageSize?: number
  action?: CredentialAuditAction
}

/** Build the POST body while omitting an unset action filter. */
export function buildCredentialAuditLogPayload(
  filters: CredentialAuditLogFilters = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? DEFAULT_CREDENTIAL_AUDIT_PAGE_SIZE,
  }
  if (filters.action) payload.action = filters.action
  return payload
}

/** Org-wide credential audit history, optionally narrowed to one action. */
export async function getCredentialAuditLogs(
  filters: CredentialAuditLogFilters = {},
): Promise<Paginated<CredentialAuditLogItem>> {
  const payload = buildCredentialAuditLogPayload(filters)
  const page = payload.page as number
  const pageSize = payload.page_size as number
  const { data } = await stabilityCaller<Paginated<CredentialAuditLogItem>>(
    endpoints.credentialManager.auditLogs,
    payload,
  )

  return {
    total: data?.total ?? 0,
    page: data?.page ?? page,
    page_size: data?.page_size ?? pageSize,
    items: data?.items ?? [],
  }
}

/* ── Rotate ───────────────────────────────────────────────────────────────── */

/**
 * What the rotate form holds. Every field except the secret is an *optional
 * amendment*: left blank, it is omitted from the payload and the server keeps
 * the stored value. That is why blanks cannot be sent here the way they are on
 * create — an empty string would overwrite good data.
 */
export interface RotateCredentialDraft {
  id: string
  secret: string
  confirmSecret: string
  username: string
  url: string
  /** 'unchanged' leaves the stored method (and its approver) alone. */
  twoFactorType: TwoFactorType | 'unchanged'
  twoFactorApprover: string
  notes: string
}

export interface RotateCredentialPayload {
  id: string
  encrypted_secret: string
  username?: string
  url?: string
  two_factor_type?: TwoFactorType
  two_factor_approver?: string
  notes?: string
}

export type RotateField = keyof RotateCredentialDraft
export type RotateErrors = Partial<Record<RotateField, string>>

export function emptyRotateDraft(id: string): RotateCredentialDraft {
  return {
    id,
    secret: '',
    confirmSecret: '',
    username: '',
    url: '',
    twoFactorType: 'unchanged',
    twoFactorApprover: '',
    notes: '',
  }
}

/**
 * Rotation is irreversible for the old secret, so the new one is typed twice —
 * unlike create, where a mistyped value can simply be rotated away afterwards.
 */
export function validateRotateDraft(draft: RotateCredentialDraft): RotateErrors {
  const errors: RotateErrors = {}

  if (!draft.id) errors.id = 'No credential selected.'
  if (!draft.secret) errors.secret = 'Enter the new secret value.'
  else if (draft.secret !== draft.confirmSecret) {
    errors.confirmSecret = 'The two secret values do not match.'
  }

  if (draft.url.trim() && !isHttpUrl(draft.url.trim())) {
    errors.url = 'Enter a full URL starting with http:// or https://'
  }

  // Only meaningful when the method is actually being changed to a real one.
  if (draft.twoFactorType !== 'unchanged' && draft.twoFactorType !== 'none') {
    const approver = draft.twoFactorApprover.trim()
    if (!approver) errors.twoFactorApprover = 'Name the approver for this second factor.'
    else if (!EMAIL_PATTERN.test(approver)) {
      errors.twoFactorApprover = 'Enter the approver as an email address.'
    }
  }

  if (draft.notes.length > credentialLimits.notesMaxLength) {
    errors.notes = `Keep notes under ${credentialLimits.notesMaxLength} characters.`
  }

  return errors
}

export function hasRotateErrors(errors: RotateErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Build the rotate payload, omitting every amendment left blank. */
export function buildRotatePayload(
  draft: RotateCredentialDraft,
  encryptedSecret: string,
): RotateCredentialPayload {
  const payload: RotateCredentialPayload = {
    id: draft.id,
    encrypted_secret: encryptedSecret,
  }
  if (draft.username.trim()) payload.username = draft.username.trim()
  if (draft.url.trim()) payload.url = draft.url.trim()
  if (draft.notes.trim()) payload.notes = draft.notes.trim()
  if (draft.twoFactorType !== 'unchanged') {
    payload.two_factor_type = draft.twoFactorType
    payload.two_factor_approver =
      draft.twoFactorType === 'none' ? '' : draft.twoFactorApprover.trim()
  }
  return payload
}

/**
 * Encrypt the new secret and replace the stored one, optionally amending
 * metadata at the same time. Same guarantee as `createCredential`: the plaintext
 * is an argument and nothing more.
 */
export async function rotateCredential(
  draft: RotateCredentialDraft,
): Promise<ApiEnvelope<Credential>> {
  const errors = validateRotateDraft(draft)
  if (hasRotateErrors(errors)) {
    throw new Error(Object.values(errors)[0] ?? 'The rotation details are incomplete.')
  }
  const encryptedSecret = await encryptSecret(draft.secret)
  return stabilityCaller<Credential>(
    endpoints.credentialManager.rotate,
    buildRotatePayload(draft, encryptedSecret),
  )
}

/* ── Request rotation ───────────────────────────────────────────────────────── */

/**
 * What the "Request Rotation" form holds. Used by roles that may ask for a
 * rotation but not perform one (Executive, Management): they supply the new secret
 * — typed twice, since it is irreversible once applied — and a justification, and
 * an admin/approver applies it.
 */
export interface RotationRequestDraft {
  id: string
  secret: string
  confirmSecret: string
  justification: string
}

/** Exactly what goes over the wire to `credential-manager/request-rotation`. */
export interface RequestRotationPayload {
  credential_id: string
  /** Encrypted client-side — a plaintext value must never appear here. */
  encrypted_secret: string
  justification: string
}

export type RotationRequestField = keyof RotationRequestDraft
export type RotationRequestErrors = Partial<Record<RotationRequestField, string>>

/** Minimum justification length, matching the access-request form. */
export const ROTATION_JUSTIFICATION_MIN = 10

export function emptyRotationRequestDraft(id: string): RotationRequestDraft {
  return { id, secret: '', confirmSecret: '', justification: '' }
}

export function validateRotationRequest(draft: RotationRequestDraft): RotationRequestErrors {
  const errors: RotationRequestErrors = {}

  if (!draft.id) errors.id = 'No credential selected.'

  if (!draft.secret) errors.secret = 'Enter the new secret value.'
  else if (draft.secret !== draft.confirmSecret) {
    errors.confirmSecret = 'The two secret values do not match.'
  }

  const justification = draft.justification.trim()
  if (!justification) errors.justification = 'A justification is required.'
  else if (justification.length < ROTATION_JUSTIFICATION_MIN) {
    errors.justification = 'Say a little more about why this rotation is needed.'
  }

  return errors
}

export function hasRotationRequestErrors(errors: RotationRequestErrors): boolean {
  return Object.keys(errors).length > 0
}

export function buildRequestRotationPayload(
  draft: RotationRequestDraft,
  encryptedSecret: string,
): RequestRotationPayload {
  return {
    credential_id: draft.id,
    encrypted_secret: encryptedSecret,
    justification: draft.justification.trim(),
  }
}

/**
 * Encrypt the proposed new secret and submit a rotation request. Same plaintext
 * guarantee as `createCredential` / `rotateCredential`: the value is an argument
 * and nothing more — it is encrypted before the request leaves the browser.
 */
export async function requestCredentialRotation(
  draft: RotationRequestDraft,
): Promise<ApiEnvelope<unknown>> {
  const errors = validateRotationRequest(draft)
  if (hasRotationRequestErrors(errors)) {
    throw new Error(Object.values(errors)[0] ?? 'The rotation request is incomplete.')
  }
  const encryptedSecret = await encryptSecret(draft.secret)
  return stabilityCaller<unknown>(
    endpoints.credentialManager.requestRotation,
    buildRequestRotationPayload(draft, encryptedSecret),
  )
}

/* ── Reveal ───────────────────────────────────────────────────────────────── */

/**
 * Pull the stored envelope out of the reveal route's response.
 *
 * The route answers with `{ credential_id, encrypted_secret }`, but this stays
 * tolerant of the three shapes it might take (a bare envelope string,
 * `{encrypted_secret}`, or a full credential object carrying the field) so a
 * harmless backend tweak to the wrapper can't break the copy button.
 */
export function extractSecretEnvelope(data: unknown): string | null {
  if (typeof data === 'string') return data.trim() || null
  if (data && typeof data === 'object') {
    const body = data as { encrypted_secret?: unknown; secret?: unknown }
    for (const candidate of [body.encrypted_secret, body.secret]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
  }
  return null
}

/**
 * Fetch a credential's stored secret and decrypt it via the decryption Worker.
 *
 * The backend authorizes and audits this copy through `get-credential-secret`;
 * the returned envelope is then decrypted by the Cloudflare Worker that holds the
 * private key (see `lib/crypto/decrypt-remote`). The key never touches the
 * browser. The plaintext is returned to the caller and never cached — the copy
 * button hands it straight to the clipboard and drops it.
 */
export async function revealCredentialSecret(id: string): Promise<string> {
  if (!id) throw new Error('No credential selected.')

  // `purpose` drives the backend audit action — this path is always a copy, so
  // it is logged as ActionCopied (rather than defaulting) for an unambiguous trail.
  const { data } = await stabilityCaller<unknown>(endpoints.credentialManager.secret, {
    id,
    purpose: 'copy',
  })
  const envelope = extractSecretEnvelope(data)
  if (!envelope) {
    throw new Error('The service did not return a stored secret for this credential.')
  }
  return decryptViaWorker(envelope)
}

/** Non-secret fields returned by get-credential-details for the copy dialog. */
export interface CredentialDetails {
  credential_id: string
  name?: string
  username?: string
  url?: string
  notes?: string
  two_factor_type?: string
}

/**
 * Fetch only the descriptive fields used to open the credential dialog. The
 * secret endpoint is deliberately not touched here: it is reserved for an
 * explicit click on Copy Password so every copy attempt is audited server-side.
 */
export async function getCredentialDetails(id: string): Promise<CredentialDetails> {
  if (!id) throw new Error('No credential selected.')

  const { data } = await stabilityCaller<Record<string, unknown> | null>(
    endpoints.credentialManager.details,
    { id },
  )
  if (!data) throw new Error('The service did not return details for this credential.')

  const body = data as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)
  return {
    credential_id: text(body.credential_id) ?? id,
    name: text(body.name),
    username: text(body.username),
    url: text(body.url),
    notes: text(body.notes),
    two_factor_type: text(body.two_factor_type),
  }
}

/* ── Delete ───────────────────────────────────────────────────────────────── */

/** Permanently remove a credential. Hard delete — the record cannot be restored. */
export async function deleteCredential(id: string): Promise<void> {
  if (!id) throw new Error('No credential selected.')
  await stabilityCaller<null>(endpoints.credentialManager.delete, { id })
}

/* ── Errors ───────────────────────────────────────────────────────────────── */

/**
 * The sentence to show when a credential call fails. `ApiError` and
 * `SecretCryptoError` are both built with user-facing wording, so this mostly
 * guards the last mile.
 */
export function credentialErrorMessage(
  err: unknown,
  fallback = 'The credential could not be saved.',
): string {
  if (err instanceof ApiError || err instanceof SecretCryptoError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}
