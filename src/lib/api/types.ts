/*
  Wire shapes for the owe-stability-service credential manager.

  These mirror the backend's JSON exactly — snake_case, and optional wherever the
  service omits a null field (it drops nulls rather than sending `"field": null`).
  Adapting them into something a component wants to render is the job of the
  feature modules and `lib/format.ts`, never of these types.

  Every route wraps its reply in `{ status, message, data }`; `stabilityCaller`
  unwraps that, so what appears here is the `data` payload alone.
*/

/** Lifecycle of an access request. */
export type RequestStatus = 'pending' | 'granted' | 'denied' | 'expired'

/** Lifecycle of a credential record. */
export type CredentialStatus = 'active' | 'archived'

/** Lifecycle of an issued grant. */
export type GrantStatus = 'active' | 'expired' | 'revoked'

/**
 * A credential record. `encrypted_secret` is deliberately absent — the service
 * never returns it on any route, so there is nothing to model.
 */
export interface Credential {
  id: string
  name: string
  username: string
  url?: string
  tags?: string[]
  two_factor_type?: string
  two_factor_approver?: string
  elevation_duration_seconds: number
  auto_grant: boolean
  notes?: string
  status: CredentialStatus
  created_by: number
  updated_by: number
  /** RFC3339, or absent when the credential has never been rotated. */
  last_rotated_at?: string | null
  created_at: string
  updated_at: string
}

/** An access request as returned by submit-request / review-request. */
export interface AccessRequest {
  id: string
  credential_id: string
  requested_by: number
  reason_category: string
  justification: string
  beneficiary_email?: string
  status: RequestStatus
  reviewed_by?: number
  denial_reason?: string | null
  requested_at: string
  reviewed_at?: string
}

/** A window of live access, issued on approval or by auto-grant. */
export interface Grant {
  id: string
  request_id?: string
  credential_id: string
  granted_to: number
  /** Absent/null when the grant was issued automatically rather than by a person. */
  granted_by?: number | null
  status: GrantStatus
  granted_at: string
  expires_at: string
  revoked_at?: string
}

/** submit-request and review-request both answer with this pair. */
export interface RequestOutcome {
  request: AccessRequest
  /** Populated on auto-grant and on approval; null when queued or denied. */
  grant: Grant | null
}

/** Shared envelope for the two paginated list routes. */
export interface Paginated<T> {
  total: number
  page: number
  page_size: number
  /** Always an array — the service sends `[]` rather than null when empty. */
  items: T[]
}

/** A row in the admin approval queue (get-pending-requests). */
export interface PendingRequestItem {
  id: string
  credential_id: string
  credential_name: string
  requested_by: number
  reason_category: string
  justification: string
  beneficiary_email?: string | null
  requested_at: string
  wait_minutes: number
  /** Set by the backend when wait_minutes exceeds 60. */
  is_sla_breach: boolean
}

/** A row in the request history (get-request-logs). */
export interface RequestLogItem {
  id: string
  credential_id: string
  credential_name: string
  credential_tags?: string[]
  elevation_duration_seconds: number
  requested_by: number
  beneficiary_email?: string | null
  reason_category: string
  justification: string
  status: RequestStatus
  reviewed_by?: number
  denial_reason?: string | null
  requested_at: string
  reviewed_at?: string
}

/** Header cards on the Pending Approvals page. */
export interface PendingStats {
  total_pending: number
  avg_wait_minutes: number
  sla_compliance_percent: number
}

/** One slice of the activity ledger's status breakdown. */
export interface StatusSlice {
  status: RequestStatus
  count: number
  percent: number
}

/** One hour of request volume. Hours with no activity are omitted entirely. */
export interface HourBucket {
  hour: string
  count: number
}

/** Org-wide last-24h metrics for the admin Activity Ledger. */
export interface ActivityStats {
  total_requests_24h: number
  pending_count: number
  denial_rate_percent: number
  /** Highest number of requests submitted in any single minute in the last 24h. */
  peak_frequency_per_min: number
  status_distribution: StatusSlice[]
  volume_by_hour: HourBucket[]
}

/** All-time per-status counts plus last-24h volume, for the signed-in user. */
export interface RequestStats {
  pending_count: number
  granted_count: number
  denied_count: number
  expired_count: number
  volume_by_hour: HourBucket[]
}
