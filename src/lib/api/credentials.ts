/*
  Credential-manager API surface: the form's shape, the wire payload, the rules
  that connect them, and the one call that creates a record.

  The pure parts (`validateCredentialDraft`, `buildCreateCredentialPayload`) are
  kept free of network and crypto so both the modal and the tests can use them
  directly. Only `createCredential` touches the outside world, and it is the sole
  place a plaintext secret is turned into an `encrypted_secret`.
*/

import { encryptSecret } from '@/lib/crypto/secret-crypto'
import { decryptSecret } from '@/lib/crypto/secret-decrypt'
import { SecretCryptoError } from '@/lib/crypto/keys'
import { ApiError, stabilityCaller } from './caller'
import { endpoints } from './endpoints'
import type { ApiEnvelope } from './caller'
import type { Credential } from './types'

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
    // Not on the form — see the note on CredentialDraft.
    tags: [],
    twoFactorType: 'totp',
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
 * Fetch a credential's stored secret and decrypt it in the browser.
 *
 * The plaintext is returned to the caller and never cached: the copy button is
 * expected to hand it straight to the clipboard and drop it.
 *
 * The one remaining precondition is the RSA private key: it must be present to
 * decrypt the envelope, which is the case in local development and deliberately
 * not in a production build. That failure surfaces as a plain sentence rather
 * than a silent no-op.
 */
export async function revealCredentialSecret(id: string): Promise<string> {
  if (!id) throw new Error('No credential selected.')

  const { data } = await stabilityCaller<unknown>(endpoints.credentialManager.secret, { id })
  const envelope = extractSecretEnvelope(data)
  if (!envelope) {
    throw new Error('The service did not return a stored secret for this credential.')
  }
  return decryptSecret(envelope)
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
