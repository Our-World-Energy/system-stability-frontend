/*
  Access requests: asking for a credential, and (for admins) reviewing the queue.

  As with credentials, the pure parts — options, validation, payload building —
  are kept free of the network so the modals and the tests share them.
*/

import { ApiError, stabilityCaller } from './caller'
import { endpoints } from './endpoints'
import type { ApiEnvelope } from './caller'
import type {
  Paginated,
  PendingRequestItem,
  RequestLogItem,
  RequestOutcome,
  RequestStatus,
} from './types'

/* ── Options ──────────────────────────────────────────────────────────────── */

/**
 * Why access is being asked for. `value` is what the backend stores — the API
 * documents the field only by example ("deployment"), so if the service turns
 * out to expect different slugs, this array is the single place to fix.
 */
export const reasonCategoryOptions = [
  { value: 'deployment', label: 'Deployment' },
  { value: 'incident_response', label: 'Incident response' },
  { value: 'scheduled_maintenance', label: 'Scheduled maintenance' },
  { value: 'investigation', label: 'Investigation / debugging' },
  { value: 'on_behalf', label: 'On behalf of another user' },
  { value: 'personal', label: 'Personal / direct use' },
] as const

export type ReasonCategory = (typeof reasonCategoryOptions)[number]['value']

/** The category that turns the beneficiary block on. */
export const ON_BEHALF_CATEGORY: ReasonCategory = 'on_behalf'

export const requestLimits = {
  justificationMinLength: 10,
  justificationMaxLength: 1000,
  denialReasonMaxLength: 500,
} as const

/* ── Submit ───────────────────────────────────────────────────────────────── */

/** What the Request Access modal holds. */
export interface AccessRequestDraft {
  credentialId: string
  reasonCategory: ReasonCategory
  justification: string
  /** Optional; required in practice only when requesting for someone else. */
  beneficiaryEmail: string
}

export interface SubmitRequestPayload {
  credential_id: string
  reason_category: ReasonCategory
  justification: string
  beneficiary_email?: string
}

export type AccessRequestField = keyof AccessRequestDraft
export type AccessRequestErrors = Partial<Record<AccessRequestField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emptyAccessRequestDraft(credentialId = ''): AccessRequestDraft {
  return {
    credentialId,
    reasonCategory: 'deployment',
    justification: '',
    beneficiaryEmail: '',
  }
}

export function validateAccessRequest(draft: AccessRequestDraft): AccessRequestErrors {
  const errors: AccessRequestErrors = {}
  const justification = draft.justification.trim()

  if (!draft.credentialId) errors.credentialId = 'No credential selected.'

  if (!justification) errors.justification = 'A justification is required.'
  else if (justification.length < requestLimits.justificationMinLength) {
    errors.justification = 'Say a little more about why this access is needed.'
  } else if (justification.length > requestLimits.justificationMaxLength) {
    errors.justification = `Keep the justification under ${requestLimits.justificationMaxLength} characters.`
  }

  const beneficiary = draft.beneficiaryEmail.trim()
  // The address is what the access is provisioned to, so it has to be right when
  // it is given at all — and it must be given when acting for someone else.
  if (beneficiary && !EMAIL_PATTERN.test(beneficiary)) {
    errors.beneficiaryEmail = 'Enter the beneficiary as an email address.'
  } else if (!beneficiary && draft.reasonCategory === ON_BEHALF_CATEGORY) {
    errors.beneficiaryEmail = 'Give the email of the person this access is for.'
  }

  return errors
}

export function buildSubmitRequestPayload(draft: AccessRequestDraft): SubmitRequestPayload {
  const payload: SubmitRequestPayload = {
    credential_id: draft.credentialId,
    reason_category: draft.reasonCategory,
    justification: draft.justification.trim(),
  }
  const beneficiary = draft.beneficiaryEmail.trim()
  if (beneficiary) payload.beneficiary_email = beneficiary
  return payload
}

/**
 * Ask for access to a credential.
 *
 * When the credential is marked `auto_grant`, the response already carries the
 * grant and access is live; otherwise `grant` is null and the request is queued
 * for an admin.
 */
export async function submitAccessRequest(
  draft: AccessRequestDraft,
): Promise<ApiEnvelope<RequestOutcome>> {
  const errors = validateAccessRequest(draft)
  if (hasRequestErrors(errors)) {
    throw new Error(Object.values(errors)[0] ?? 'The request details are incomplete.')
  }
  return stabilityCaller<RequestOutcome>(
    endpoints.credentialManager.submitRequest,
    buildSubmitRequestPayload(draft),
  )
}

export function hasRequestErrors(errors: AccessRequestErrors): boolean {
  return Object.keys(errors).length > 0
}

/* ── Review ───────────────────────────────────────────────────────────────── */

export type ReviewAction = 'approve' | 'deny'

/**
 * Approve or deny a pending request. Approving creates the grant atomically, so
 * the returned `grant` is the authoritative window; denying stores the reason
 * and returns `grant: null`.
 */
export async function reviewRequest(
  requestId: string,
  action: ReviewAction,
  denialReason = '',
): Promise<ApiEnvelope<RequestOutcome>> {
  if (!requestId) throw new Error('No request selected.')
  const reason = denialReason.trim()
  if (action === 'deny' && !reason) throw new Error('Give a reason for denying this request.')

  return stabilityCaller<RequestOutcome>(endpoints.credentialManager.reviewRequest, {
    request_id: requestId,
    action,
    denial_reason: action === 'deny' ? reason : '',
  })
}

/* ── Lists ────────────────────────────────────────────────────────────────── */

export const DEFAULT_PAGE_SIZE = 25

/** Oldest-first queue of requests awaiting an admin decision. */
export async function getPendingRequests(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Paginated<PendingRequestItem>> {
  const { data } = await stabilityCaller<Paginated<PendingRequestItem>>(
    endpoints.credentialManager.pendingRequests,
    { page, page_size: pageSize },
  )
  return normalizePage(data, page, pageSize)
}

/** Filters accepted by the request history. All are optional. */
export interface RequestLogFilters {
  page?: number
  pageSize?: number
  /** Admin-only: narrow to one requester. */
  userId?: number
  status?: RequestStatus
  /** RFC3339 timestamps. */
  dateFrom?: string
  dateTo?: string
}

/**
 * Request history. An admin sees everyone's requests and may filter by user; a
 * regular user only ever gets their own, whatever is sent.
 */
export async function getRequestLogs(
  filters: RequestLogFilters = {},
): Promise<Paginated<RequestLogItem>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const payload: Record<string, unknown> = { page, page_size: pageSize }

  // Only send the optional filters that are actually set — a zero user_id or an
  // empty status would otherwise read as "filter by nothing at all".
  if (filters.userId) payload.user_id = filters.userId
  if (filters.status) payload.status = filters.status
  if (filters.dateFrom) payload.date_from = filters.dateFrom
  if (filters.dateTo) payload.date_to = filters.dateTo

  const { data } = await stabilityCaller<Paginated<RequestLogItem>>(
    endpoints.credentialManager.requestLogs,
    payload,
  )
  return normalizePage(data, page, pageSize)
}

/** Guard the list shape so a page never has to defend against a missing `items`. */
function normalizePage<T>(
  data: Paginated<T> | null | undefined,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    total: data?.total ?? 0,
    page: data?.page ?? page,
    page_size: data?.page_size ?? pageSize,
    items: data?.items ?? [],
  }
}

/* ── Errors ───────────────────────────────────────────────────────────────── */

export function requestErrorMessage(err: unknown, fallback = 'The request could not be sent.') {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}
