import type { ServiceStatus } from './dashboard-data'

/**
 * Server status vocabulary → UI status.
 * Server: none | minor | major | critical | vendor_silent
 * UI:     healthy | degraded | critical | vendor_silent
 * minor + major both surface as the amber "degraded" pill; anything
 * unrecognized is treated as vendor_silent (grey) so the UI never breaks.
 */
export function mapStatus(raw: unknown): ServiceStatus {
  switch (raw) {
    case 'none':
      return 'healthy'
    case 'minor':
    case 'major':
      return 'degraded'
    case 'critical':
      return 'critical'
    case 'vendor_silent':
      return 'vendor_silent'
    default:
      return 'vendor_silent'
  }
}

/** A null / missing / non-object payload becomes an empty object. */
export function normalizePayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
}

/** Response time from a live payload as a display string ("16ms"), or undefined. */
export function payloadLatency(payload: Record<string, unknown>): string | undefined {
  const rt = payload.response_time_ms
  return typeof rt === 'number' ? `${rt}ms` : undefined
}

/**
 * Short, vendor-agnostic status description from a live payload.
 * Payload shapes differ per system (Aurora uses `description`, Solo uses
 * `page_status`/`active_incidents`), so pull whichever known field exists.
 */
export function payloadDescription(payload: Record<string, unknown>): string | undefined {
  const desc = payload.description ?? payload.page_status
  if (typeof desc === 'string' && desc.trim()) return desc.trim()
  if (typeof payload.active_incidents === 'number') {
    return payload.active_incidents === 0 ? 'No active incidents' : `${payload.active_incidents} active incidents`
  }
  return undefined
}

/**
 * Resolve the status WebSocket URL.
 * Priority: explicit VITE_WS_URL → derived from VITE_API_BASE_URL host
 * (http→ws, https→wss; port from VITE_WS_PORT, default 3001) → localhost.
 */
export function resolveWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) {
    // Relative value (e.g. "/ws/status") → same-origin, behind a reverse proxy.
    // Uses wss on https pages to avoid mixed-content blocking.
    if (explicit.startsWith('/')) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${window.location.host}${explicit}`
    }
    return explicit
  }

  const port = import.meta.env.VITE_WS_PORT || '3001'
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    try {
      const u = new URL(apiBase, window.location.origin)
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${u.hostname}:${port}/ws/status`
    } catch {
      /* malformed base → fall through to localhost */
    }
  }
  return `ws://localhost:${port}/ws/status`
}

/** ISO timestamp → "3s ago" / "5m ago" / "2h ago". Null/invalid → "—". */
export function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
