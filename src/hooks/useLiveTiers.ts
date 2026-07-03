import { tiers, type Service, type Tier } from '@/lib/dashboard-data'
import { formatRelative, payloadDescription, payloadLatency, payloadNote } from '@/lib/ws-status'
import { useStatusStore, type ConnectionState, type LiveSystem } from '@/store/status'
import { useTick } from './useTick'

/**
 * Overlay live WebSocket data onto a single static service.
 * Only services with a `systemId` are wired (Option B: Aurora + Solo);
 * every other card renders exactly as authored.
 */
function mergeService(
  svc: Service,
  systems: Record<string, LiveSystem>,
  connection: ConnectionState,
  size: 'lg' | 'sm',
): Service {
  if (!svc.systemId) return svc

  const live = systems[svc.systemId]
  if (live) {
    // Live data wins. While reconnecting we intentionally keep the last
    // known value (stale) — the header badge signals the disconnect.
    // Use live response time as the metric; keep the static metric if absent.
    const latency = payloadLatency(live.payload)
    return {
      ...svc,
      status: live.status,
      updated: formatRelative(live.updatedAt),
      metric: latency ?? svc.metric,
      metricLabel: latency ? 'Response Time' : svc.metricLabel,
      detail: payloadDescription(live.payload),
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

/** Static tiers with Aurora/Solo overlaid by live WebSocket state. */
export function useLiveTiers(): Tier[] {
  const systems = useStatusStore((s) => s.systems)
  const connection = useStatusStore((s) => s.connection)
  useTick(1000) // refresh "Xs ago" labels

  return tiers.map((tier) => {
    const size = tier.id === 'tier-1' || tier.id === 'tier-2' ? 'lg' : 'sm'
    return {
      ...tier,
      services: tier.services.map((svc) => mergeService(svc, systems, connection, size)),
    }
  })
}
