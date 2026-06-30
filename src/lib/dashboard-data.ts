export type ServiceStatus = 'healthy' | 'degraded' | 'critical' | 'vendor_silent'

export interface Service {
  name: string
  vendor: string
  status: ServiceStatus
  updated: string
  metric?: string
  metricLabel?: string
  note?: string
  sparkline?: number[]
  /** When set, this card is driven live by the WebSocket (keyed by this id). */
  systemId?: string
  /** Live, vendor-agnostic detail line (e.g. "16ms · All Systems Operational"). */
  detail?: string
  /** Optional footer marker shown above the timestamp. */
  badge?: { type: 'book' } | { type: 'pill'; text: string }
}

export interface Tier {
  id: string
  label: string
  services: Service[]
}

export const tiers: Tier[] = [
  {
    id: 'tier-1',
    label: 'Tier 1 — Revenue Critical',
    services: [
      {
        name: 'Aurora',
        systemId: 'aurora',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '47',
        metricLabel: 'Designs Today',
        updated: '3s ago',
        sparkline: [12, 18, 14, 22, 19, 28, 24, 33, 30, 38],
        badge: { type: 'book' },
      },
      {
        name: 'Solo',
        systemId: 'solo',
        vendor: 'Synthetic',
        status: 'healthy',
        metric: '1.4k',
        metricLabel: 'Sales Index',
        updated: '3s ago',
        sparkline: [40, 38, 42, 41, 45, 44, 48, 47, 52, 55],
        badge: { type: 'pill', text: 'SIGNAL+' },
      },
      {
        name: 'Sales Platform',
        vendor: '/health (internal)',
        status: 'healthy',
        metric: '142',
        metricLabel: 'Deals Submitted',
        updated: '3s ago',
        sparkline: [20, 24, 21, 26, 30, 28, 32, 31, 36, 40],
        badge: { type: 'book' },
      },
      {
        name: 'DocuSign',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '312',
        metricLabel: 'Env Sent',
        updated: '3s ago',
        sparkline: [30, 33, 31, 35, 34, 38, 42, 39, 44, 47],
      },
    ],
  },
  {
    id: 'tier-2',
    label: 'Tier 2 — Infrastructure',
    services: [
      {
        name: 'Cloudflare',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '99.9%',
        metricLabel: 'Uptime',
        note: 'Network operations optimal.',
        updated: '30s ago',
      },
      {
        name: 'Twilio',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '8.2k',
        metricLabel: 'SMS Vol',
        updated: '3s ago',
        sparkline: [55, 50, 58, 52, 60, 57, 62, 59, 64, 61],
      },
      {
        name: 'Welcome Call',
        vendor: 'internal /health',
        status: 'degraded',
        metric: '12',
        metricLabel: 'Calls Today',
        note: 'Latency High',
        updated: '30s ago',
        sparkline: [40, 38, 44, 36, 30, 34, 22, 28, 18, 24],
      },
      {
        name: 'One Verify',
        vendor: 'internal /health',
        status: 'healthy',
        metric: 'Active',
        metricLabel: 'Service Status',
        note: 'ID Verification active.',
        updated: '30s ago',
      },
    ],
  },
  {
    id: 'tier-3',
    label: 'Tier 3 — Operational',
    services: [
      { name: 'One Portal', vendor: '/health', status: 'healthy', note: '200 OK · 9ms', updated: '1m ago' },
      { name: 'UKG', vendor: 'Synthetic', status: 'healthy', note: 'Login success', updated: '1m ago' },
      { name: 'Autodesk', vendor: 'Statuspage', status: 'healthy', note: 'All Green', updated: '1m ago' },
      { name: 'Tape', vendor: 'Webhook', status: 'healthy', note: 'Listening…', updated: '1m ago' },
      { name: 'Zapier', vendor: 'Statuspage', status: 'degraded', note: 'Relay slow', updated: '1m ago' },
      { name: 'Atlassian', vendor: 'Statuspage', status: 'healthy', note: 'Jira stable', updated: '1m ago' },
    ],
  },
  {
    id: 'tier-4',
    label: 'Tier 4 — Lowest Priority',
    services: [
      {
        name: '360 Hosting',
        vendor: 'K8s Scrape',
        status: 'vendor_silent',
        note: 'No status feed available',
        updated: '—',
      },
      {
        name: 'Tesla PV',
        vendor: 'Synthetic',
        status: 'critical',
        note: 'Auth Fail: SSO Service Unavailable',
        updated: '5m ago',
      },
      {
        name: 'Enphase',
        vendor: 'Synthetic',
        status: 'healthy',
        note: 'API responding within normal parameters',
        updated: '5m ago',
      },
      { name: 'Palmetto', vendor: 'Synthetic', status: 'healthy', note: 'Sync completed successfully', updated: '5m ago' },
    ],
  },
]

/** Live counts derived from the data so the header always matches the cards. */
export function getSystemSummary(allTiers: Tier[] = tiers) {
  const all = allTiers.flatMap((t) => t.services)
  return {
    total: all.length,
    healthy: all.filter((s) => s.status === 'healthy').length,
    degraded: all.filter((s) => s.status === 'degraded').length,
    critical: all.filter((s) => s.status === 'critical').length,
    noFeed: all.filter((s) => s.status === 'vendor_silent').length,
  }
}
