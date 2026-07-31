/*
  Mock data for the Credential Manager feature.

  Mirrors the shape we expect from the future privileged-access API, so pages and
  components can be built against real types today and swapped to live data later
  by replacing the exported consts with fetch/react-query calls. See
  `dashboard-data.ts` for the same "types + typed mock array + helpers" pattern.
*/

import type { RequestDetail } from './request-detail'

/** Whether a credential is granted instantly or gated behind a reviewer. */
export type Eligibility = 'auto_grants' | 'requires_approval'

export interface Credential {
  id: string
  /** Human label, e.g. "GitHub — Org Admin". */
  name: string
  /** Machine token surfaced in the request modals, e.g. "GITHUB_ORG_ADMIN". */
  keyName: string
  /** Free-form classification chips, e.g. ["#devtools", "#org-level"]. */
  tags: string[]
  eligibility: Eligibility
  description: string
  /** Max elevation window granted, e.g. "1h", "30s". */
  elevation: string
  /** Vault namespace the temporary key is provisioned into. */
  namespace: string
}

/** Length of a granted elevation window (kept in sync with the approval dialog). */
export const GRANT_WINDOW_MS = (59 * 60 + 59) * 1000

/** Deterministic demo secret for a credential; the real key comes from the API. */
export function demoSecret(keyName: string): string {
  return `sk_live_${keyName.toLowerCase()}_9f3a2b7c`
}

/** Format a millisecond duration as HH:MM:SS (clamped at zero). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}

/** The catalog a Requester can browse and request one credential at a time. */
export const credentials: Credential[] = [
  {
    id: 'github-org-admin',
    name: 'GitHub — Org Admin',
    keyName: 'GITHUB_ORG_ADMIN',
    tags: ['#devtools', '#org-level'],
    eligibility: 'auto_grants',
    description:
      'Full administrative access to the primary GitHub organization and all repositories.',
    elevation: '1h',
    namespace: 'scm-github-primary',
  },
  {
    id: 'aws-root-console',
    name: 'AWS — Root Console',
    keyName: 'AWS_ROOT_CONSOLE',
    tags: ['#infrastructure'],
    eligibility: 'requires_approval',
    description: 'Access to the root console for AWS production environments and billing controls.',
    elevation: '4h',
    namespace: 'aws-prod-root',
  },
  {
    id: 'slack-owner-scope',
    name: 'Slack — Owner Scope',
    keyName: 'SLACK_OWNER_SCOPE',
    tags: ['#communication'],
    eligibility: 'auto_grants',
    description:
      'Workspace primary ownership level. Access to retention, exports and app policies.',
    elevation: '2h',
    namespace: 'slack-workspace-owner',
  },
  {
    id: 'datadog-admin',
    name: 'Datadog — Admin',
    keyName: 'DATADOG_ADMIN',
    tags: ['#monitoring'],
    eligibility: 'requires_approval',
    description:
      'Manage organization settings, billing, and full dashboard and monitor configuration.',
    elevation: '2h',
    namespace: 'datadog-org-admin',
  },
  {
    id: 'veracode-scanner',
    name: 'Veracode — Scanner',
    keyName: 'VERACODE_SCANNER',
    tags: ['#security'],
    eligibility: 'auto_grants',
    description:
      'Ability to initiate static and dynamic application security scans across pipelines.',
    elevation: '1h',
    namespace: 'veracode-scan-runner',
  },
  {
    id: 'snowflake-accountadmin',
    name: 'Snowflake — ACCOUNTADMIN',
    keyName: 'SNOWFLAKE_ACCOUNTADMIN',
    tags: ['#data'],
    eligibility: 'requires_approval',
    description:
      'Highest privilege level in Snowflake. Manage resource monitors, warehouses and roles.',
    elevation: '30s',
    namespace: 'snowflake-prod-admin',
  },
]

/** Catalog filter presets shown as chips above the table. */
export type CatalogFilter = 'all' | 'auto_grants' | 'requires_approval'

/** Reason presets in the Request Access modal. */
export const reasonCategories = [
  'On behalf of another user',
  'Personal / direct use',
  'Incident response',
  'Scheduled maintenance',
] as const
export type ReasonCategory = (typeof reasonCategories)[number]

// ── Request Log's ──────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'granted' | 'denied' | 'expired'

/** Extra fields surfaced in the Request Details dialog for a requester's own logs. */
export interface AccessRequestDetails {
  /** Display request code, e.g. "REQ-4471-AWS". */
  ref: string
  requester: string
  requesterId: string
  approver: string
  /** Access scope, e.g. "ROOT_CONSOLE". */
  accessScope: string
  justification: string
  beneficiaryName: string
  beneficiaryId: string
  policyCheckTime: string
  routedTo: string
  finalTime?: string
}

export interface AccessRequest {
  id: string
  /** Credential label, e.g. "AWS — Root Console". */
  credential: string
  /** Classification line, e.g. "INFRASTRUCTURE • PRODUCTION". */
  scope: string
  /** ISO-like timestamp string as returned by the audit log. */
  requestedAt: string
  status: RequestStatus
  /** Requested elevation window, e.g. "4h", "30m". */
  duration: string
  details: AccessRequestDetails
}

// All rows are the current user's own requests (Alex Chan · USR_ALEX_C).
const SELF = { requester: 'Alex Chan', requesterId: 'USR_ALEX_C' }

/** Recent elevation history (page 1 of the audit log). */
export const accessRequests: AccessRequest[] = [
  {
    id: 'req-1',
    credential: 'AWS — Root Console',
    scope: 'INFRASTRUCTURE • PRODUCTION',
    requestedAt: '2023-10-27 14:22:05',
    status: 'pending',
    duration: '4h',
    details: {
      ref: 'REQ-4471-AWS',
      ...SELF,
      approver: 'Awaiting Admin…',
      accessScope: 'ROOT_CONSOLE',
      justification: 'Investigating a production billing anomaly flagged by finance.',
      beneficiaryName: 'Alex Chan',
      beneficiaryId: 'USR_ALEX_C',
      policyCheckTime: '14:22:09',
      routedTo: 'Admin_Root',
    },
  },
  {
    id: 'req-2',
    credential: 'K8S — Cluster Admin',
    scope: 'PLATFORM • STAGING',
    requestedAt: '2023-10-27 12:45:12',
    status: 'granted',
    duration: '1h',
    details: {
      ref: 'REQ-4468-K8S',
      ...SELF,
      approver: 'System_Automator',
      accessScope: 'CLUSTER_ADMIN',
      justification: 'Draining a node pool to apply a security patch on staging.',
      beneficiaryName: 'Alex Chan',
      beneficiaryId: 'USR_ALEX_C',
      policyCheckTime: '12:45:16',
      routedTo: 'Admin_Platform',
      finalTime: '12:49:30',
    },
  },
  {
    id: 'req-3',
    credential: 'DB — Postgres Master',
    scope: 'DATA • PRODUCTION',
    requestedAt: '2023-10-27 09:15:33',
    status: 'denied',
    duration: '30m',
    details: {
      ref: 'REQ-4455-DB',
      ...SELF,
      approver: 'Admin_Root',
      accessScope: 'WRITE_MASTER',
      justification: 'Manual data correction for a mis-migrated customer record.',
      beneficiaryName: 'Alex Chan',
      beneficiaryId: 'USR_ALEX_C',
      policyCheckTime: '09:15:37',
      routedTo: 'Admin_Data',
      finalTime: '09:22:10',
    },
  },
  {
    id: 'req-4',
    credential: 'SSH — Jump Host',
    scope: 'ACCESS • GLOBAL',
    requestedAt: '2023-10-26 18:00:00',
    status: 'expired',
    duration: '24h',
    details: {
      ref: 'REQ-4390-SSH',
      ...SELF,
      approver: 'System_CleanUp',
      accessScope: 'SHELL_ACCESS',
      justification: 'Long-running log collection from the bastion for an incident review.',
      beneficiaryName: 'Alex Chan',
      beneficiaryId: 'USR_ALEX_C',
      policyCheckTime: '18:00:04',
      routedTo: 'Admin_Access',
      finalTime: '2023-10-27 18:00:00',
    },
  },
  {
    id: 'req-5',
    credential: 'GCP — IAM Editor',
    scope: 'IAM • ORGANIZATION',
    requestedAt: '2023-10-26 16:30:45',
    status: 'granted',
    duration: '2h',
    details: {
      ref: 'REQ-4381-GCP',
      ...SELF,
      approver: 'Admin_Manager',
      accessScope: 'IAM_EDITOR',
      justification: 'Granting a new service account the roles for the analytics pipeline.',
      beneficiaryName: 'Alex Chan',
      beneficiaryId: 'USR_ALEX_C',
      policyCheckTime: '16:30:49',
      routedTo: 'Admin_Org',
      finalTime: '16:35:12',
    },
  },
]

/** Flatten an access request into the shared Request Details shape. */
export function accessRequestToDetail(req: AccessRequest): RequestDetail {
  const d = req.details
  return {
    id: d.ref,
    requesterName: d.requester,
    requesterId: d.requesterId,
    timestamp: req.requestedAt,
    status: req.status,
    approver: d.approver,
    resource: req.credential,
    scope: d.accessScope,
    justification: d.justification,
    beneficiaryName: d.beneficiaryName,
    beneficiaryId: d.beneficiaryId,
    policyCheckTime: d.policyCheckTime,
    routedTo: d.routedTo,
    finalTime: d.finalTime,
  }
}

export interface RequestSummary {
  pending: number
  granted: number
  denied: number
  expired: number
  /** New pending requests since the last live sync. */
  pendingDelta: number
  /** Granted success rate, 0–100. */
  successRate: number
}

export const requestSummary: RequestSummary = {
  pending: 12,
  granted: 142,
  denied: 8,
  expired: 294,
  pendingDelta: 3,
  successRate: 94,
}

export const totalRequests = 456

/** Requests-per-hour buckets for the Temporal Distribution chart (00:00 → 23:00). */
export const temporalDistribution: number[] = [8, 14, 22, 41, 68, 52, 44, 30, 26, 18, 12, 9]
