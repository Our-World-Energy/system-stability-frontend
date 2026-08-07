import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { routeRedirectFor } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth'

/**
 * Route guard for the role-restricted pages, wrapped once around the whole signed-in
 * shell rather than per route: which roles may open which path is declared by the
 * `guard` field in `src/config/navigation.ts`, so adding a restricted page is a
 * config change and never a routing change.
 *
 * Sits inside `AppLayout` so the sidebar and navbar stay mounted while the content
 * swaps — a redirect here is a role landing on the page it does work in, not an
 * error, and it should not flash the whole shell.
 */
export function RequireRole() {
  const { pathname } = useLocation()
  const role = useAuthStore((s) => s.user?.role ?? null)
  const redirectTo = routeRedirectFor(pathname, role)

  if (redirectTo) return <Navigate to={redirectTo} replace />
  return <Outlet />
}
