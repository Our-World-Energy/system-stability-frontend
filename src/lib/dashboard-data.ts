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
  /** Per-point tooltip labels for the sparkline; when set, the sparkline is interactive. */
  sparkLabels?: string[]
  /** Per-point status, parallel to `sparkline` — drives yellow/red incident dots on the graph. */
  sparkStatuses?: ServiceStatus[]
  /** True when the card has no live API feed yet → rendered blurred with a "Coming Soon" overlay. */
  comingSoon?: boolean
  /** When set, this card is driven live by the status feed (keyed by this id). */
  systemId?: string
  /** Live, vendor-agnostic detail line (e.g. "16ms · All Systems Operational"). */
  detail?: string
  /** True when the vendor reports a planned maintenance window (e.g. One Verify's
   * `ready_status: "maintenance"`) → show a maintenance badge instead of a warning. */
  maintenance?: boolean
  /** Optional footer marker shown above the timestamp. */
  badge?: { type: 'book' } | { type: 'pill'; text: string }
}

export interface Tier {
  id: string
  label: string
  services: Service[]
}

// Only SSE-wired (live) systems are displayed. Each card carries a `systemId`
// and is organized into the roadmap tier it belongs to. Non-wired demo cards
// were removed — nothing renders here without a live feed behind it.
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
        name: 'DocuSign',
        systemId: 'docusign',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
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
        systemId: 'cloudflare',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '99.9%',
        metricLabel: 'Uptime',
        note: 'Network operations optimal.',
        updated: '30s ago',
      },
      {
        name: '20i',
        // The feed keys this system as "twentyi" (a JSON key can't start with a digit).
        systemId: 'twentyi',
        vendor: 'RSS feed',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [28, 30, 27, 32, 31, 34, 30, 33, 35, 32],
      },
      {
        name: 'Twilio',
        systemId: 'twilio',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '8.2k',
        metricLabel: 'SMS Vol',
        updated: '3s ago',
        sparkline: [55, 50, 58, 52, 60, 57, 62, 59, 64, 61],
      },
      {
        name: 'One Verify',
        systemId: 'one_verify',
        vendor: 'internal /health',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [24, 26, 23, 28, 25, 30, 27, 32, 29, 34],
      },
      {
        name: 'One Portal',
        systemId: 'one_portal',
        vendor: '/health',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [20, 24, 21, 26, 30, 28, 32, 31, 36, 40],
      },
      {
        name: 'RingCentral',
        systemId: 'ringcentral',
        vendor: 'status.json',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Services Up',
        updated: '—',
        sparkline: [78, 78, 77, 78, 78, 76, 78, 77, 78, 78],
      },
    ],
  },
  {
    id: 'tier-3',
    label: 'Tier 3 — Operational',
    services: [
      {
        name: 'Autodesk',
        systemId: 'autodesk',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [33, 31, 35, 32, 36, 34, 38, 35, 40, 37],
      },
      {
        name: 'SendGrid',
        systemId: 'sendgrid',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [26, 24, 28, 25, 30, 27, 32, 29, 34, 31],
      },
    ],
  },
  {
    id: 'tier-4',
    label: 'Tier 4 — Lowest Priority',
    services: [
      {
        name: 'Atlassian',
        systemId: 'atlassian',
        vendor: 'Statuspage.io',
        status: 'healthy',
        metric: '—',
        metricLabel: 'Response Time',
        updated: '—',
        sparkline: [20, 22, 21, 24, 23, 26, 25, 28, 27, 30],
      },
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
