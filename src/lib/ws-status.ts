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
 * The headline metric + label for a card from its live payload.
 * Most systems expose `response_time_ms` (→ "16ms" / "Response Time").
 * RingCentral has no response time but reports service counts instead
 * (→ "77/78" / "Services Up"). Falls back to the card's static metric.
 */
export function payloadMetric(payload: Record<string, unknown>): { value: string; label: string } | undefined {
  const rt = payload.response_time_ms
  if (typeof rt === 'number') return { value: `${rt}ms`, label: 'Response Time' }
  const good = payload.services_good
  const total = payload.services_total
  if (typeof good === 'number' && typeof total === 'number') return { value: `${good}/${total}`, label: 'Services Up' }
  return undefined
}

/**
 * Cloudflare summary line from its composite payload.
 * Cloudflare's card status is the worst of platform + cert + domain + dns, but
 * `platform_status` and the countdowns are kept separate (spec) so you can tell
 * "them" (platform) from "you" (cert/domain). Gated on the Cloudflare-only
 * `cert_days_left`/`domain_days_left` fields so other composite systems (e.g.
 * 20i, which also carries `platform_status`) are never affected.
 */
export function cloudflareSummary(payload: Record<string, unknown>): string | undefined {
  const cert = payload.cert_days_left
  const domain = payload.domain_days_left
  if (typeof cert !== 'number' && typeof domain !== 'number') return undefined
  const parts: string[] = []
  const ps = payload.platform_status
  if (typeof ps === 'string' && ps) parts.push(ps === 'none' ? 'Platform OK' : `Platform ${ps}`)
  if (typeof cert === 'number') parts.push(`cert ${cert}d`)
  if (typeof domain === 'number') parts.push(`domain ${domain}d`)
  return parts.length ? parts.join(' · ') : undefined
}

/**
 * RingCentral summary line from its aggregate feed payload.
 * Gated on `services_total` (a RingCentral-only field) so no other system is
 * affected. Surfaces the first affected service when there is one.
 */
export function ringcentralSummary(payload: Record<string, unknown>): string | undefined {
  const total = payload.services_total
  const good = payload.services_good
  if (typeof total !== 'number' || typeof good !== 'number') return undefined
  const base = `${good}/${total} services operational`
  const affected = payload.affected_services
  if (Array.isArray(affected) && affected.length && typeof affected[0] === 'string') {
    return `${base} · ${affected[0]}`
  }
  return base
}

/**
 * Short, vendor-agnostic status description from a live payload.
 * Payload shapes differ per system (Aurora uses `description`, Solo uses
 * `page_status`/`active_incidents`), so pull whichever known field exists.
 */
export function payloadDescription(payload: Record<string, unknown>): string | undefined {
  // Cloudflare is composite: surface platform + the most urgent countdown.
  const cf = cloudflareSummary(payload)
  if (cf) return cf
  // RingCentral: "77/78 services operational · <first affected>".
  const rc = ringcentralSummary(payload)
  if (rc) return rc
  // Vendors differ: Aurora=description, Solo=page_status, 20i=detail.
  // error_detail is present only on vendor_silent — surface it so the reason shows.
  const desc = payload.description ?? payload.error_detail ?? payload.page_status ?? payload.detail
  if (typeof desc === 'string' && desc.trim()) return desc.trim()
  if (typeof payload.active_incidents === 'number') {
    return payload.active_incidents === 0 ? 'No active incidents' : `${payload.active_incidents} active incidents`
  }
  return undefined
}

/**
 * Compact one-line note for Tier 3/4 cards, e.g. "200 OK · 13ms".
 * Falls back to the description when there's no http/latency info.
 */
export function payloadNote(payload: Record<string, unknown>): string | undefined {
  const parts: string[] = []
  const http = payload.http_status
  if (typeof http === 'number') parts.push(`${http} ${http < 400 ? 'OK' : 'ERR'}`)
  const rt = payload.response_time_ms
  if (typeof rt === 'number') parts.push(`${rt}ms`)
  return parts.length ? parts.join(' · ') : payloadDescription(payload)
}

/**
 * Resolve the status SSE (EventSource) URL.
 * SSE now lives on the SAME origin as the REST status API (the Go stability
 * service), at `/sse/status` — no separate realtime host/port.
 * Priority: explicit VITE_SSE_URL → VITE_API_BASE_URL's origin + /sse/status →
 * same-origin as the page.
 */
export function resolveSseUrl(): string {
  const explicit = import.meta.env.VITE_SSE_URL
  if (explicit) {
    // Relative value (e.g. "/sse/status") → same-origin, behind a reverse proxy.
    if (explicit.startsWith('/')) return `${window.location.origin}${explicit}`
    return explicit
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    try {
      // Strip the API path (e.g. "/api"); SSE hangs off the same origin.
      return `${new URL(apiBase, window.location.origin).origin}/sse/status`
    } catch {
      /* malformed base → fall through */
    }
  }
  return `${window.location.origin}/sse/status`
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

/** ISO timestamp → local date + time, e.g. "Jul 8, 2:53 PM". Null/invalid → "". */
export function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Human label for a status, used in tooltips. */
export function statusWord(status: ServiceStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'degraded':
      return 'Degraded'
    case 'critical':
      return 'Critical'
    default:
      return 'No feed'
  }
}
