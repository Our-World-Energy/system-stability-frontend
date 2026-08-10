/*
  The single mount point for analytics.

  One component owns identity and page views for the whole app, so login, logout,
  a refresh that restores a session, and one user replacing another in the same
  tab all follow the same path. Calling `setAnalyticsUser` from a login screen as
  well would double up and eventually disagree.

  Must be rendered inside the router — it reads `useLocation` — and it renders
  nothing.

  There is no `authReady` gate here, unlike the integration guide's example: this
  app's auth store is built synchronously from localStorage when the module
  loads, so a restored session is already known on the first render and the first
  page view cannot outrun it.
*/

import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { clearAnalyticsUser, setAnalyticsUser, trackPageView } from './googleAnalytics'
import { analyticsUserId } from '@/lib/jwt'
import { useAuthStore } from '@/store/auth'

export function AnalyticsObserver(): null {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.user?.role ?? null)

  // Straight off the token rather than the cached profile beside it: the profile
  // is written at login, so a session that predates this integration would have
  // no id in it, while the token it was built from still does.
  const userId = useMemo(() => analyticsUserId(token), [token])

  const lastUserId = useRef<string | null>(null)
  const lastRole = useRef<string | null>(null)

  // Identity first, so the page view below is attributed to the right user. Both
  // effects run in order on the same commit.
  useEffect(() => {
    if (userId) {
      if (lastUserId.current !== userId || lastRole.current !== role) {
        setAnalyticsUser(userId, { role: role ?? 'unknown' })
        lastUserId.current = userId
        lastRole.current = role
      }
      return
    }

    if (lastUserId.current !== null) {
      clearAnalyticsUser()
      lastUserId.current = null
      lastRole.current = null
    }
  }, [userId, role])

  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    const path = location.pathname + location.search
    // StrictMode runs this effect twice on mount in development, which would send
    // the initial route twice and make DebugView look like a double-counting bug.
    // Re-sending the path already showing is a no-op anyway.
    if (lastPath.current === path) return
    lastPath.current = path
    trackPageView(path)
  }, [location.pathname, location.search])

  return null
}
