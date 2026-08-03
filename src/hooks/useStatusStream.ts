import { useEffect } from 'react'
import { useStatusStore } from '@/store/status'

/** Minimal EventSource surface we depend on — lets tests inject a mock. */
export interface EventSourceLike {
  addEventListener(type: string, listener: (ev: MessageEvent) => void): void
  onopen: ((ev: Event) => void) | null
  onerror: ((ev: Event) => void) | null
  readyState: number
  close(): void
}

/** The store actions the stream drives (subset of the status store). */
export interface StreamStore {
  setConnecting(): void
  markOpen(): void
  markClosed(): void
  applySnapshot(systems: unknown): void
  applyUpdate(
    system: string,
    msg: { status?: unknown; updated_at?: string | null; payload?: unknown },
  ): void
}

const CLOSED = 2 // EventSource.CLOSED — reached only on a fatal (non-reconnecting) error.

function parse(data: unknown): Record<string, unknown> | null {
  try {
    const o = JSON.parse(typeof data === 'string' ? data : '')
    return o && typeof o === 'object' ? (o as Record<string, unknown>) : null
  } catch {
    return null // malformed frame → ignore, never throw
  }
}

/**
 * Wire a (mockable) EventSource to the status store; returns a teardown fn.
 *
 * - Uses named events (`addEventListener`), not `onmessage`.
 * - The server resends `initial_snapshot` on every (re)connect, so state
 *   self-heals — we just re-apply it each time.
 * - EventSource reconnects itself; we never write reconnect logic, only mirror
 *   connection state so the UI can show a "live / reconnecting" indicator.
 * - `: ping` heartbeat comments are ignored by EventSource automatically.
 */
export function attachStatusStream(es: EventSourceLike, store: StreamStore): () => void {
  store.setConnecting()

  es.onopen = () => store.markOpen()

  es.onerror = () => {
    // CLOSED = fatal (won't retry); anything else = transient drop → reconnecting.
    if (es.readyState === CLOSED) store.markClosed()
    else store.setConnecting()
  }

  es.addEventListener('initial_snapshot', (ev) => {
    const msg = parse(ev.data)
    if (msg) store.applySnapshot(msg.systems)
  })

  es.addEventListener('status_update', (ev) => {
    const msg = parse(ev.data)
    if (msg) store.applyUpdate(String(msg.system ?? ''), msg)
  })

  return () => es.close()
}

/**
 * Receive-only health-status SSE client (browser-native EventSource).
 * Opens for the app's lifetime and closes on teardown to avoid leaked
 * connections. No manual reconnect — EventSource handles it.
 */
export function useStatusStream(url: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const store = useStatusStore.getState()
    let es: EventSource
    try {
      es = new EventSource(url)
    } catch {
      store.markClosed()
      return
    }
    return attachStatusStream(es as unknown as EventSourceLike, store)
  }, [url, enabled])
}
