import { tiers, type Service, type Tier } from '@/lib/dashboard-data'
import { formatDateTime, formatRelative, payloadDescription, payloadMetric, payloadNote, statusWord } from '@/lib/ws-status'
import { useStatusStore, type ConnectionState, type LiveSystem } from '@/store/status'
import { useTick } from './useTick'

/**
 * Overlay live SSE data onto a single static service.
 * Only services with a `systemId` are wired (Option B: Aurora + Solo);
 * every other card renders exactly as authored.
 */
function mergeService(
  svc: Service,
  systems: Record<string, LiveSystem>,
  connection: ConnectionState,
  size: 'lg' | 'sm',
): Service {
  // Not wired to the live API → mark as "coming soon" (blurred placeholder).
  if (!svc.systemId) return { ...svc, comingSoon: true }

  const live = systems[svc.systemId]

  // Backend hasn't run the first check yet (snapshot value was null) → the feed
  // is healthy, we're just waiting for data. Distinct from a disconnect below.
  if (live?.pending) {
    return {
      ...svc,
      status: 'vendor_silent',
      metric: '—',
      metricLabel: 'Response Time',
      detail: 'Waiting for first check…',
      note: size === 'sm' ? 'Waiting for first check…' : svc.note,
      updated: '—',
    }
  }

  if (live) {
    // Live data wins. While reconnecting we intentionally keep the last
    // known value (stale) — the header badge signals the disconnect.
    // Live metric (response time, or service count for RingCentral); keep the
    // static metric if the payload carries neither.
    const m = payloadMetric(live.payload)
    // Real rolling history → interactive sparkline. Until ≥2 points exist we
    // keep the static decorative line (and no tooltip, so no fake numbers).
    const unit = typeof live.payload.response_time_ms === 'number' ? 'ms' : ''
    const hasHistory = live.samples.length >= 2
    return {
      ...svc,
      status: live.status,
      updated: formatRelative(live.updatedAt),
      metric: m?.value ?? svc.metric,
      metricLabel: m ? m.label : svc.metricLabel,
      detail: payloadDescription(live.payload),
      sparkline: hasHistory ? live.samples.map((s) => s.v) : svc.sparkline,
      sparkStatuses: hasHistory ? live.samples.map((s) => s.status) : undefined,
      // Tooltip leads with the status + when it happened; value is secondary.
      sparkLabels: hasHistory
        ? live.samples.map((s) =>
            [statusWord(s.status), s.v ? `${s.v}${unit}` : '', formatDateTime(s.t)].filter(Boolean).join(' · '),
          )
        : undefined,
      // Compact (Tier 3/4) cards render `note`; keep it live. Never touch the
      // note on large cards (it drives the degraded warn line there).
      note: size === 'sm' ? (payloadNote(live.payload) ?? svc.note) : svc.note,
    }
  }

  // No live data for a wired system → show an honest "no feed" state rather
  // than the static demo values (which would look like real, current data).
  return {
    ...svc,
    status: 'vendor_silent',
    metric: '—',
    metricLabel: 'Response Time',
    detail: NO_FEED_DETAIL[connection],
    note: size === 'sm' ? NO_FEED_DETAIL[connection] : svc.note,
    updated: '—',
  }
}

const NO_FEED_DETAIL: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  open: 'Awaiting data…',
  reconnecting: 'Reconnecting…',
  failed: 'No status feed',
}

/** Static tiers with wired cards overlaid by live SSE state. */
export function useLiveTiers(): Tier[] {
  const systems = useStatusStore((s) => s.systems)
  const connection = useStatusStore((s) => s.connection)
  useTick(1000) // refresh "Xs ago" labels

  return tiers.map((tier) => {
    const size = tier.id === 'tier-4' ? 'sm' : 'lg'
    return {
      ...tier,
      services: tier.services.map((svc) => mergeService(svc, systems, connection, size)),
    }
  })
}
