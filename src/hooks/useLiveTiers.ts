import { tiers, type Service, type Tier } from '@/lib/dashboard-data'
import { formatRelative, payloadDescription, payloadLatency } from '@/lib/ws-status'
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

  return tiers.map((tier) => ({
    ...tier,
    services: tier.services.map((svc) => mergeService(svc, systems, connection)),
  }))
}
