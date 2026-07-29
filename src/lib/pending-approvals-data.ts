/*
  Mock data for the admin Pending Approvals queue. Shapes mirror the expected
  authorization-request API so this swaps to live data cleanly later.
*/

/** Wait-time severity, mapped to the healthy/warning/critical legend. */
export type WaitSeverity = 'healthy' | 'warning' | 'critical'

export interface ApprovalRequest {
  id: string
  timestamp: string
  userName: string
  /** Avatar initials. */
  initials: string
  /** Requested resource, e.g. "PROD-DB-CLUSTER-01". */
  resource: string
  /** Access scope, e.g. "READ_WRITE_ACCESS". */
  scope: string
  /** Elapsed wait, e.g. "42m 12s". */
  waitTime: string
  waitSeverity: WaitSeverity
  /** True past the SLA threshold — shown with a breach marker. */
  slaBreach?: boolean
  /** Break-glass request — highlighted identity. */
  emergency?: boolean
}

export const approvalStats = {
  totalPending: 142,
  totalDelta: '+12 since 1h',
  avgWaitTime: '18.4m',
  avgWaitTrend: '-2.1m trending',
  slaCompliance: '94.2%',
  slaTarget: 'Target: 95%',
}

export const approvalQueue: ApprovalRequest[] = [
  {
    id: 'REQ-9921-XF',
    timestamp: '2023-11-24 14:22:01',
    userName: 'Artemis Miller',
    initials: 'AM',
    resource: 'PROD-DB-CLUSTER-01',
    scope: 'READ_WRITE_ACCESS',
    waitTime: '42m 12s',
    waitSeverity: 'warning',
  },
  {
    id: 'REQ-8472-AL',
    timestamp: '2023-11-24 14:35:14',
    userName: 'John Doe',
    initials: 'JD',
    resource: 'IAM-ROOT-POLICIES',
    scope: 'ELEVATED_SUDO',
    waitTime: '28m 05s',
    waitSeverity: 'warning',
  },
  {
    id: 'REQ-7712-WK',
    timestamp: '2023-11-24 14:48:55',
    userName: 'Sarah Connor',
    initials: 'SC',
    resource: 'AWS-GATEWAY-VPC',
    scope: 'CONFIG_MODIFICATION',
    waitTime: '15m 22s',
    waitSeverity: 'healthy',
  },
  {
    id: 'REQ-6554-ZQ',
    timestamp: '2023-11-24 14:59:10',
    userName: 'Thomas K.',
    initials: 'TK',
    resource: 'AZURE-KEYVAULT-PROD',
    scope: 'SECRET_RETRIEVAL',
    waitTime: '04m 58s',
    waitSeverity: 'healthy',
  },
  {
    id: 'REQ-1029-EM',
    timestamp: '2023-11-24 13:10:45',
    userName: 'Emergency Admin',
    initials: 'EM',
    resource: 'NETWORK-CORE-ROUTER',
    scope: 'EMERGENCY_PATCH',
    waitTime: '2h 53m',
    waitSeverity: 'critical',
    slaBreach: true,
    emergency: true,
  },
]

export const approvalTotals = { from: 1, to: 25, total: 142 }
