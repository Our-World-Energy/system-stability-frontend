import { useEffect } from 'react'
import { useStatusStore } from '@/store/status'

/**
 * REST fallback for the live feed, used only for debugging or on hosts that
 * can't hold a long-lived SSE stream (e.g. Vercel). Polls the per-system debug
 * endpoints and patches the same store the SSE stream uses, so the cards render
 * identically. Goes through the Vite proxy (relative /api) to avoid CORS in dev.
 *
 * NOTE: the live UI uses SSE; this poller is a debug/host-constraint stopgap
 * (enabled via VITE_STATUS_TRANSPORT=rest).
 */
// `id` = SSE/store key; `rest` = REST endpoint path (defaults to id).
// One Portal is keyed `one_portal` on the WS but `one-portal` on REST.
const SYSTEMS: { id: string; rest: string }[] = [
  { id: 'aurora', rest: 'aurora' },
  { id: 'solo', rest: 'solo' },
  { id: 'twentyi', rest: 'twentyi' },
  { id: 'twilio', rest: 'twilio' },
  { id: 'one_portal', rest: 'one-portal' },
  { id: 'cloudflare', rest: 'cloudflare' },
  { id: 'ringcentral', rest: 'ringcentral' },
  { id: 'atlassian', rest: 'atlassian' },
]
const POLL_MS = Number(import.meta.env.VITE_STATUS_POLL_MS) || 30000

/** Relative API path prefix (e.g. "/api") so requests hit the dev proxy. */
function basePath(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) {
    try {
      return new URL(base, window.location.origin).pathname.replace(/\/+$/, '') || '/api'
    } catch {
      /* fall through */
    }
  }
  return '/api'
}

export function useStatusPoller(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const store = useStatusStore.getState
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined

    async function fetchSystem(sys: { id: string; rest: string }) {
      const res = await fetch(`${basePath()}/owe-stability-service/${sys.rest}/status`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      const data = (body?.data ?? {}) as Record<string, unknown>
      // Status field differs per vendor: Aurora uses `indicator`, Solo `status`.
      return {
        id: sys.id, // store under the WS key so cards resolve consistently
        status: data.indicator ?? data.status,
        updated_at: (data.checked_at as string) ?? null,
        payload: data,
      }
    }

    async function pollOnce() {
      const results = await Promise.allSettled(SYSTEMS.map(fetchSystem))
      if (stopped) return
      const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchSystem>>> => r.status === 'fulfilled')
      ok.forEach((r) => store().applyUpdate(r.value.id, r.value))
      if (ok.length > 0) store().markOpen()
      else store().markClosed()
    }

    pollOnce()
    timer = setInterval(pollOnce, POLL_MS)
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
    }
  }, [enabled])
}
