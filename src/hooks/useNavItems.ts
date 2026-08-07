import { useMemo } from 'react'
import { navItemsForRole, type NavItem } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth'

/**
 * The sidebar items the signed-in role may see.
 *
 * The one place the session and the navigation config meet: which roles get which
 * links is declared in `src/config/navigation.ts`, and the role comes from the
 * JWT's claims via the auth store, so the list re-resolves on sign-in and
 * sign-out without the Sidebar knowing anything about roles.
 */
export function useNavItems(): NavItem[] {
  const role = useAuthStore((s) => s.user?.role ?? null)
  return useMemo(() => navItemsForRole(role), [role])
}
