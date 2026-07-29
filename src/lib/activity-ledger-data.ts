/*
  Mock data for the admin Global Activity Ledger (org-wide elevation audit trail).
  Reuses the RequestStatus lifecycle from `credentials-data.ts`.
*/

import type { RequestStatus } from './credentials-data'
import type { RequestDetail } from './request-detail'

/** Extra fields surfaced in the Request Details dialog (audit timeline + context). */
export interface LedgerDetails {
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

export interface LedgerEntry {
  id: string
  requesterName: string
  /** Directory id, e.g. "USR_8291_S". */
  requesterId: string
  /** Avatar initials. */
  initials: string
  /** Requested credential handle, e.g. "RSA-KEY-29402". */
  credentialId: string
  timestamp: string
  status: RequestStatus
  /** Who actioned it, or the pending note. */
  approver: string
  details: LedgerDetails
}

export const ledgerEntries: LedgerEntry[] = [
  {
    id: 'REQ-9921-XF',
    requesterName: 'Marcus Chen',
    requesterId: 'USR_8291_S',
    initials: 'MC',
    credentialId: 'RSA-KEY-29402',
    timestamp: '2023-10-24 14:22:01',
    status: 'pending',
    approver: 'Awaiting Admin…',
    details: {
      resource: 'PROD-DB-CLUSTER-01',
      scope: 'READ_WRITE_ACCESS',
      justification: 'Emergency hotfix for auth-service critical latency in production.',
      beneficiaryName: 'System_Automator',
      beneficiaryId: 'USR_0045_A',
      policyCheckTime: '14:22:05',
      routedTo: 'Admin_Root',
    },
  },
  {
    id: 'REQ-8472-AL',
    requesterName: 'Sarah Adelman',
    requesterId: 'USR_9045_A',
    initials: 'SA',
    credentialId: 'TOKEN-H82-X90',
    timestamp: '2023-10-24 13:58:44',
    status: 'granted',
    approver: 'System_Automator',
    details: {
      resource: 'AZURE-KEYVAULT-PROD',
      scope: 'SECRET_RETRIEVAL',
      justification: 'Rotating expiring TLS certificates for the payments gateway.',
      beneficiaryName: 'Sarah Adelman',
      beneficiaryId: 'USR_9045_A',
      policyCheckTime: '13:58:47',
      routedTo: 'Admin_Root',
      finalTime: '14:03:20',
    },
  },
  {
    id: 'REQ-7712-WK',
    requesterName: 'James Low',
    requesterId: 'USR_7712_X',
    initials: 'JL',
    credentialId: 'AWS-IAM-PROD',
    timestamp: '2023-10-24 13:12:00',
    status: 'denied',
    approver: 'Admin_Root',
    details: {
      resource: 'AWS-IAM-PROD',
      scope: 'ELEVATED_SUDO',
      justification: 'Requesting root policy access to debug an intermittent deploy failure.',
      beneficiaryName: 'James Low',
      beneficiaryId: 'USR_7712_X',
      policyCheckTime: '13:12:04',
      routedTo: 'Admin_Root',
      finalTime: '13:19:41',
    },
  },
  {
    id: 'REQ-3321-BT',
    requesterName: 'Brian T.',
    requesterId: 'USR_3321_B',
    initials: 'BT',
    credentialId: 'OAUTH-EXT-01',
    timestamp: '2023-10-24 09:05:32',
    status: 'expired',
    approver: 'System_CleanUp',
    details: {
      resource: 'OAUTH-EXT-01',
      scope: 'CONFIG_MODIFICATION',
      justification: 'Updating OAuth redirect URIs for the partner integration sandbox.',
      beneficiaryName: 'Brian T.',
      beneficiaryId: 'USR_3321_B',
      policyCheckTime: '09:05:36',
      routedTo: 'Admin_Manager',
      finalTime: '17:05:36',
    },
  },
  {
    id: 'REQ-9504-EL',
    requesterName: 'Elena L.',
    requesterId: 'USR_9504_L',
    initials: 'EL',
    credentialId: 'GIT-PAT-901',
    timestamp: '2023-10-24 08:30:15',
    status: 'granted',
    approver: 'Admin_Manager',
    details: {
      resource: 'GIT-PAT-901',
      scope: 'READ_WRITE_ACCESS',
      justification: 'Backfilling CI secrets after the release-runner token was revoked.',
      beneficiaryName: 'Elena L.',
      beneficiaryId: 'USR_9504_L',
      policyCheckTime: '08:30:19',
      routedTo: 'Admin_Manager',
      finalTime: '08:41:02',
    },
  },
]

/** Flatten a ledger entry into the shared Request Details shape. */
export function ledgerEntryToDetail(entry: LedgerEntry): RequestDetail {
  return {
    id: entry.id,
    requesterName: entry.requesterName,
    requesterId: entry.requesterId,
    timestamp: entry.timestamp,
    status: entry.status,
    approver: entry.approver,
    resource: entry.details.resource,
    scope: entry.details.scope,
    justification: entry.details.justification,
    beneficiaryName: entry.details.beneficiaryName,
    beneficiaryId: entry.details.beneficiaryId,
    policyCheckTime: entry.details.policyCheckTime,
    routedTo: entry.details.routedTo,
    finalTime: entry.details.finalTime,
  }
}

export const ledgerStats = {
  totalRequests: 842,
  totalTrend: '+12%',
  pendingApproval: 14,
  denialRate: '3.4%',
  systemUptime: '99.99%',
}

export const ledgerTotals = { displayed: 25, total: 842, page: 1, pages: 34 }

/** Requests-per-interval buckets for the live Request Volume chart. */
export const requestVolume: number[] = [6, 9, 7, 12, 10, 14, 11, 16, 13, 18, 15, 20, 17, 14, 12, 9]
export const peakFrequency = '12 req/min'

/** Filter dropdown presets (labels only for the demo). */
export const ledgerFilters = [
  { label: 'Filter by User', value: 'All Requesters' },
  { label: 'Credential Type', value: 'Any Type' },
  { label: 'Status', value: 'All Statuses' },
  { label: 'Date Range', value: 'Last 24 Hours' },
]

/** Status distribution for the side panel (must sum to 100). */
export const statusDistribution: { label: string; pct: number; color: string }[] = [
  { label: 'Granted', pct: 72, color: 'bg-healthy' },
  { label: 'Denied', pct: 14, color: 'bg-critical-bright' },
  { label: 'Pending / Expired', pct: 14, color: 'bg-degraded' },
]
