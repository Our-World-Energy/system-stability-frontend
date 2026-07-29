import type { RequestStatus } from './credentials-data'

/*
  Normalized shape consumed by the Request Details dialog. Both the admin Global
  Activity Ledger and the requester Request Log's map their rows to this, so the
  dialog stays decoupled from either page's row model.
*/
export interface RequestDetail {
  /** Display request code, e.g. "REQ-9921-XF". */
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
  /** Access scope, e.g. "READ_WRITE_ACCESS". */
  scope: string
  justification: string
  beneficiaryName: string
  beneficiaryId: string
  /** Automated policy-check timestamp (clock only). */
  policyCheckTime: string
  /** Queue the request was routed to for approval. */
  routedTo: string
  /** Final-action timestamp — present once the request left the pending state. */
  finalTime?: string
}
