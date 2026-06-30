import { useEffect } from 'react'
import { useStatusStore } from '@/store/status'

/**
 * Receive-only health-status WebSocket client.
 *
 * - Renders initial_snapshot, then patches single systems on status_update.
 * - Auto-reconnects with exponential backoff (1s → 2s → 4s … capped at 30s).
 * - Never sends messages; the browser answers protocol pings automatically.
 * - Unknown message types / malformed frames are ignored, never thrown.
 */
export function useStatusSocket(url: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const store = useStatusStore.getState
    let ws: WebSocket | null = null
    let attempt = 0
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const scheduleReconnect = () => {
      if (stopped) return
      store().markClosed()
      const delay = Math.min(1000 * 2 ** attempt, 30000)
      attempt += 1
      timer = setTimeout(connect, delay)
    }

    function connect() {
      if (stopped) return
      store().setConnecting()
      try {
        ws = new WebSocket(url)
      } catch {
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        attempt = 0 // reset backoff after a successful connection
        store().markOpen()
      }

      ws.onmessage = (ev) => {
        let msg: { type?: string; systems?: unknown; system?: string } | null = null
        try {
          msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '')
        } catch {
          return // malformed JSON → ignore
        }
        if (!msg || typeof msg !== 'object') return
        if (msg.type === 'initial_snapshot') {
          store().applySnapshot(msg.systems)
        } else if (msg.type === 'status_update') {
          store().applyUpdate(String(msg.system ?? ''), msg as never)
        }
        // any other type → ignore silently
      }

      ws.onerror = () => {
        try {
          ws?.close()
        } catch {
          /* onclose will schedule the retry */
        }
      }

      ws.onclose = () => {
        if (!stopped) scheduleReconnect()
      }
    }

    connect()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (ws) {
        ws.onclose = null // prevent reconnect on intentional teardown
        try {
          ws.close()
        } catch {
          /* noop */
        }
      }
    }
  }, [url, enabled])
}
