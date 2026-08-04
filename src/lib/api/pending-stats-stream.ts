/*
  Live pending-approval metrics over Server-Sent Events.

  The backend turned `get-pending-stats` from a POST getter into a GET
  `text/event-stream` that pushes the header-card numbers whenever a request is
  submitted, approved or denied — so the cards update on their own, with no
  polling, and every open tab moves together.

  Browser-native `EventSource` can't carry the `Authorization: Bearer` header
  this admin-only route needs, so the stream is read with `fetch` + a
  ReadableStream reader instead — reusing the exact token the REST client sends.
  One connection is shared across every subscriber; it opens when the first
  subscriber arrives and closes when the last leaves, and reconnects itself on a
  drop the way EventSource would.
*/

import { TOKEN_KEY, clearStoredSession } from '@/lib/auth-storage'
import { stabilityBaseUrl } from './client'
import { endpoints } from './endpoints'
import type { PendingStats } from './types'

/** The same route the POST getter used, now consumed as a GET event-stream. */
export const pendingStatsStreamUrl = `${stabilityBaseUrl.replace(/\/+$/, '')}/${
  endpoints.credentialManager.pendingStats
}`

/* ── SSE frame parsing (pure — exercised directly by the tests) ─────────────── */

/**
 * Split a running buffer into complete SSE frames plus the trailing partial.
 * Frames are delimited by a blank line; the remainder is carried to the next
 * read so a frame split across two network chunks is never lost.
 */
export function splitSseFrames(buffer: string): { frames: string[]; rest: string } {
  const parts = buffer.split(/\r\n\r\n|\n\n/)
  const rest = parts.pop() ?? ''
  return { frames: parts, rest }
}

/**
 * The joined `data:` payload of one frame, or `null` for a heartbeat / comment
 * frame that carries no data. Multiple `data:` lines join with a newline, per
 * the SSE spec; the single optional space after the colon is stripped.
 */
export function frameData(frame: string): string | null {
  const data: string[] = []
  for (const line of frame.split(/\r\n|\n/)) {
    if (line.startsWith(':')) continue // comment / keep-alive
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  return data.length ? data.join('\n') : null
}

/**
 * Coerce a frame's JSON into `PendingStats`, filling zeros for anything omitted
 * — the same guarantee the old REST getter gave, so a card shows "0" rather
 * than "undefined". Tolerates both a bare `{ total_pending, … }` frame and the
 * enveloped `{ status, message, data }` the REST routes use, since the backend
 * said only that the `data.*` fields are unchanged. Returns `null` on anything
 * unparseable so a malformed frame is ignored rather than thrown.
 */
export function extractPendingStats(json: string): PendingStats | null {
  let payload: unknown
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object') return null
  const env = payload as { data?: unknown }
  const source = (
    env.data && typeof env.data === 'object' ? env.data : payload
  ) as Partial<PendingStats>
  return {
    total_pending: source.total_pending ?? 0,
    avg_wait_minutes: source.avg_wait_minutes ?? 0,
    sla_compliance_percent: source.sla_compliance_percent ?? 0,
  }
}

/* ── Shared connection ──────────────────────────────────────────────────────── */

type Listener = (stats: PendingStats) => void

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

const listeners = new Set<Listener>()
/** Last value seen, replayed to a late subscriber so it isn't stuck loading. */
let latest: PendingStats | null = null
let controller: AbortController | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let backoffMs = INITIAL_BACKOFF_MS
let running = false

/**
 * Subscribe to live pending-approval stats. The returned function unsubscribes;
 * the shared connection closes once the last subscriber is gone.
 */
export function subscribePendingStats(listener: Listener): () => void {
  listeners.add(listener)
  if (latest) listener(latest)
  if (!running) start()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

function emit(stats: PendingStats): void {
  latest = stats
  for (const listener of listeners) listener(stats)
}

function start(): void {
  running = true
  backoffMs = INITIAL_BACKOFF_MS
  void connect()
}

function stop(): void {
  running = false
  latest = null
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  controller?.abort()
  controller = null
  backoffMs = INITIAL_BACKOFF_MS
}

function scheduleReconnect(): void {
  if (!running || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, backoffMs)
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
}

async function connect(): Promise<void> {
  if (!running) return
  controller = new AbortController()
  const token = localStorage.getItem(TOKEN_KEY)

  try {
    const res = await fetch(pendingStatsStreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })

    // Mirror the REST interceptor: an expired session bounces to login.
    if (res.status === 401) {
      clearStoredSession()
      window.location.href = '/login'
      stop()
      return
    }
    if (!res.ok || !res.body) {
      scheduleReconnect()
      return
    }

    // A healthy connection resets the backoff for the next drop.
    backoffMs = INITIAL_BACKOFF_MS
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { frames, rest } = splitSseFrames(buffer)
      buffer = rest
      for (const frame of frames) {
        const data = frameData(frame)
        if (!data) continue
        const stats = extractPendingStats(data)
        if (stats) emit(stats)
      }
    }
    // The server closed the stream — treat it as a drop and reconnect.
    scheduleReconnect()
  } catch {
    // A deliberate teardown aborts the fetch; that is not a failure to retry.
    if (controller?.signal.aborted) return
    scheduleReconnect()
  }
}
