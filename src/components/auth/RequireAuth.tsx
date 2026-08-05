import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/**
 * Route guard for the authenticated shell.
 *
 * Two gates, in order:
 *  1. No token → /login, remembering where they were headed so sign-in lands there.
 *  2. `must_change_password` → /change-password. An account created by an admin
 *     starts on a backend-generated password, and the flag stays true until
 *     change-password succeeds, so this closes the whole app until it does.
 */
export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  if (!token) {
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace state={{ from }} />
  }

  return <Outlet />
}

/**
 * Token-only guard, without the forced-password gate.
 *
 * /change-password needs exactly this: it is the screen `RequireAuth` redirects
 * *to*, so guarding it with `RequireAuth` would be an infinite redirect — but it
 * still calls a protected endpoint and is pointless without a session.
 */
export function RequireSession() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    )
  }
  return <Outlet />
}
