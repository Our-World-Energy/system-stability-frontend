/*
  Keeps an already-open tab honest about a session that has been invalidated
  elsewhere.

  The backend re-checks the caller's live account state on every request, so an
  admin changing a user's role (or disabling them) invalidates that user's token
  immediately — the next protected call 401s and `endSession` bounces the tab to
  the login screen.

  "The next protected call" is the catch. A tab parked on the Dashboard makes none:
  the status feed is public, and the role in the sidebar is read from the JWT cached
  at login. Left alone, such a tab would keep rendering the old role's navigation
  until something happened to call the API — which is exactly the stale-tab symptom
  this hook exists to close. So it makes one cheap protected call itself: on mount,
  whenever the tab is brought back to the front, and on a slow timer for a tab that
  is never left.

  Nothing here handles the 401 — `lib/api/client.ts` already does, for every call
  the app makes. This only ensures a call happens.
*/

import { useEffect } from 'react'
import { getRequestStats } from '@/lib/api/stats'
import { TOKEN_KEY } from '@/lib/auth-storage'
import { useAuthStore } from '@/store/auth'

/** Floor between probes, so tab-switching a few times is still one request. */
const MIN_INTERVAL_MS = 60_000

/** Backstop for a tab that stays in the foreground and idle. */
const POLL_MS = 5 * 60_000

export function useSessionWatch() {
  const token = useAuthStore((s) => s.token)
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    if (!token) return

    let last = 0

    const probe = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - last < MIN_INTERVAL_MS) return
      last = now
      // Cheapest protected route open to every role — the caller's own request
      // counts. The reply is discarded; the point is the auth check in front of
      // it. A rejection needs no handling here: a 401 has already ended the
      // session by the time this resolves, and anything else (offline, a 500) is
      // not evidence the session is gone.
      void getRequestStats().catch(() => {})
    }

    probe()
    const timer = setInterval(probe, POLL_MS)
    window.addEventListener('focus', probe)
    document.addEventListener('visibilitychange', probe)

    // A second tab of the same browser ending the session clears `token` from
    // localStorage. This tab hears that as a storage event and follows, rather
    // than staying up with a store still holding the now-deleted session.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue === null) signOut()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', probe)
      document.removeEventListener('visibilitychange', probe)
      window.removeEventListener('storage', onStorage)
    }
  }, [token, signOut])
}
