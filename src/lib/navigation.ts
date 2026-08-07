import type { LucideIcon } from 'lucide-react'
import { pageNavigation } from '@/config/navigation'
import type { RoleKey } from '@/lib/api/user-management.types'

/*
  Navigation derived from the central page navigation config — two things, from the
  one source:

  - which sidebar links a role is offered (`navItemsForRole`, reached through the
    `useNavItems` hook), with active highlighting resolved automatically (the most
    specific route wins);
  - which routes a role may open (`routeRedirectFor`, applied once by `RequireRole`
    around the whole app shell).

  Neither is a security boundary — a role could still call an endpoint by hand, and
  the API is what actually enforces that. These two decide which screen a role is
  offered and which it lands on.
*/

export interface NavItem {
  /** Route path this link navigates to. */
  to: string
  /** Text shown next to the icon. */
  label: string
  /** lucide-react icon component. */
  icon: LucideIcon
  /** Roles this link is shown to; `undefined` means every role. */
  rolesAllowed?: readonly RoleKey[]
}

/** Every configured sidebar item, before any role filtering. */
export const navItems: NavItem[] = pageNavigation.flatMap((page) =>
  page.sidebar
    ? [
        {
          to: page.path,
          label: page.sidebar.label,
          icon: page.sidebar.icon,
          rolesAllowed: page.sidebar.rolesAllowed,
        },
      ]
    : [],
)

/**
 * The items `role` may see, in config order.
 *
 * An item without a `rolesAllowed` list is visible to everyone. A missing role —
 * no session at all, or a token whose claims would not parse — is shown every
 * item, matching how OweAppPlatform's sidebar treats a null role and keeping the
 * VITE_REQUIRE_AUTH=false dev shell able to reach the whole app.
 */
export function navItemsForRole(role: RoleKey | null | undefined): NavItem[] {
  if (!role) return navItems
  return navItems.filter(({ rolesAllowed }) => !rolesAllowed || rolesAllowed.includes(role))
}

/**
 * The nav item whose route best matches `pathname`. A link matches when the path
 * equals its `to` or is nested beneath it; when several match, the longest (most
 * specific) `to` wins. Returns `undefined` on routes not owned by any nav item.
 *
 * Pass the role's own `items` so highlighting only ever lands on a link that is
 * actually on screen; it defaults to the full list.
 */
export function activeNavItem(pathname: string, items: NavItem[] = navItems): NavItem | undefined {
  return items
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
}

/*
  Route guards. Only the pages that declare one are listed, most specific first, so
  a nested route resolves to the nearest guard above it: /credentials/admin/pending
  finds /credentials/admin's, while /credentials/logs finds none.
*/
const guardedRoutes = pageNavigation
  .flatMap((page) => (page.guard ? [{ path: page.path, guard: page.guard }] : []))
  .sort((a, b) => b.path.length - a.path.length)

function guardFor(pathname: string) {
  return guardedRoutes.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`))?.guard
}

/**
 * Whether `role` may open `pathname`. Unguarded routes are open to everyone, as is
 * every route to a missing role — no session, or a token whose claims would not
 * parse — which keeps the VITE_REQUIRE_AUTH=false dev shell working.
 */
export function canRoleOpen(pathname: string, role: RoleKey | null | undefined): boolean {
  if (!role) return true
  const guard = guardFor(pathname)
  return !guard || guard.rolesAllowed.includes(role)
}

/**
 * Where `role` should be sent instead of `pathname`, or null to stay put.
 *
 * A fallback the role also cannot open would bounce forever, so that case lands on
 * the Overview instead — unreachable with today's config, and cheap insurance
 * against a future guard whose fallback is itself restricted.
 */
export function routeRedirectFor(
  pathname: string,
  role: RoleKey | null | undefined,
): string | null {
  if (canRoleOpen(pathname, role)) return null
  const fallback = guardFor(pathname)?.fallbackPath ?? '/'
  return canRoleOpen(fallback, role) ? fallback : '/'
}
