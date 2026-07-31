import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/**
 * Route guard for the authenticated shell. Bounces signed-out visitors to
 * /login, remembering where they were headed so sign-in can land them there.
 */
export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    )
  }
  return <Outlet />
}
