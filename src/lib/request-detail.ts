/*
  Normalized shape consumed by the Request Details dialog. Both the admin Global
  Activity Ledger and the requester Request Log's map their rows to this, so the
  dialog stays decoupled from either page's row model.

  Several fields are optional because the service does not record them: these
  routes carry no policy-check stamp and no approval-routing queue. The dialog
  omits those steps rather than showing invented values.
*/

import { formatDuration, formatTagLine, formatTimestamp, formatUserRef } from './format'
import type { RequestLogItem, RequestStatus } from './api/types'

export interface RequestDetail {
  /** Display request code — the leading block of the uuid. */
  id: string
  requesterName: string
  requesterId: string
  /** Request timestamp (full date-time). */
  timestamp: string
  status: RequestStatus
  /** Final actor, or the pending note. */
  approver: string
  /** Target resource, e.g. "PROD-DB-CLUSTER-01". */
  resource: string
  /** Classification line, e.g. "INFRASTRUCTURE • PRODUCTION". */
  scope: string
  justification: string
  beneficiaryName: string
  /** Absent when access is for an external email rather than a directory user. */
  beneficiaryId?: string
  /** Automated policy-check timestamp. Not recorded by the current API. */
  policyCheckTime?: string
  /** Queue the request was routed to. Not recorded by the current API. */
  routedTo?: string
  /** Final-action timestamp — present once the request left the pending state. */
  finalTime?: string
  /** Why the request was turned down. Present on denied requests. */
  denialReason?: string
  /** Elevation window the credential grants, e.g. "1h". */
  duration?: string
}

/** Requests are identified by uuid; the first block is enough to tell them apart. */
export function shortRequestId(id: string): string {
  return id.split('-')[0]?.toUpperCase() ?? id
}

/** Flatten an API request-log row into the shared Request Details shape. */
export function requestLogToDetail(item: RequestLogItem): RequestDetail {
  const requester = formatUserRef(item.requested_by)
  return {
    id: shortRequestId(item.id),
    requesterName: requester,
    requesterId: requester,
    timestamp: formatTimestamp(item.requested_at),
    status: item.status,
    approver: item.reviewed_by
      ? formatUserRef(item.reviewed_by)
      : item.status === 'pending'
        ? 'Awaiting Admin…'
        : '—',
    resource: item.credential_name,
    // The tag line is the richer label; fall back to the reason when untagged.
    scope:
      formatTagLine(item.credential_tags) || item.reason_category.replace(/_/g, ' ').toUpperCase(),
    justification: item.justification,
    beneficiaryName: item.beneficiary_email || requester,
    beneficiaryId: item.beneficiary_email ? undefined : requester,
    finalTime: item.reviewed_at ? formatTimestamp(item.reviewed_at) : undefined,
    denialReason: item.denial_reason ?? undefined,
    duration: formatDuration(item.elevation_duration_seconds),
  }
}
