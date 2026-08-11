import { KeyRound, LayoutGrid, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoleKey } from '@/lib/api/user-management.types'
import { rolesExcept } from '@/lib/roles'

/** Any route this app registers. */
type RoutePath = `/${string}` | '/'

export interface PageNavigationConfig {
  /** Route already registered in App.tsx. */
  path: RoutePath
  /** Title shown in the top navbar. */
  navbarTitle: string
  /** Overview-only navbar controls. */
  showSystemStats?: boolean
  /** Omit this object when the route should not appear in the sidebar. */
  sidebar?: {
    label: string
    icon: LucideIcon
    /**
     * Roles this link is *offered* to. Omit for "every role sees it" — the
     * default, so only the entries that are actually restricted carry a list.
     *
     * `rolesExcept('org_admin')` hides an item from the admin, `['org_admin']`
     * shows it to the admin alone, and a pair of entries written that way swap
     * places for that one role.
     */
    rolesAllowed?: readonly RoleKey[]
  }
  /**
   * Roles allowed to *open* this route, and where anyone else is sent instead.
   * Omit for an unguarded route — most of them.
   *
   * Nested routes inherit the nearest guard above them, so guarding
   * `/credentials/admin` covers its logs and pending pages too. Note this is a
   * separate decision from `sidebar.rolesAllowed`: a page can be reachable by URL
   * without being offered in the sidebar (and the API enforces its own rules
   * either way — this only decides which screen a role lands on).
   */
  guard?: {
    rolesAllowed: readonly RoleKey[]
    /** Defaults to the Overview, which every role can open. */
    fallbackPath?: RoutePath
  }
}

/**
 * Single source of truth for sidebar items, navbar titles, which roles see each
 * sidebar item, and which roles may open each route.
 * Sidebar items appear in the same order as their entries in this array.
 */
export const pageNavigation = [
  {
    path: '/',
    navbarTitle: 'System Visibility',
    showSystemStats: true,
    sidebar: { label: 'Overview', icon: LayoutGrid },
  },
  {
    path: '/users',
    navbarTitle: 'User Management',
    sidebar: { label: 'Users', icon: Users },
  },
  // The two credential entries occupy the same sidebar slot: everyone works out of
  // the requester-facing Credential Manager, while the Organizational Admin and the
  // Executive User get the admin console in its place rather than both. The admin
  // console is guarded as well, so anyone else who types the URL lands on the
  // requester page instead. (The Exec's console is view + request-rotation only;
  // the direct rotate/create/purge controls are gated to the org admin in-page.)
  {
    path: '/credentials',
    navbarTitle: 'Credential Manager',
    sidebar: {
      label: 'Credentials',
      icon: KeyRound,
      rolesAllowed: rolesExcept('org_admin', 'executive_user'),
    },
  },
  { path: '/credentials/logs', navbarTitle: 'Credential Manager' },
  {
    path: '/credentials/admin',
    navbarTitle: 'Credential Manager',
    sidebar: {
      label: 'Credential Admin',
      icon: ShieldCheck,
      rolesAllowed: ['org_admin', 'executive_user'],
    },
    // The console itself is org_admin + executive. The two nested routes below
    // declare their own guards (most-specific wins), because their audiences
    // differ: the ledger is the org admin's, and the approval queue is worked by
    // the org admin and the platform admin (who reach it from the requester view).
    guard: { rolesAllowed: ['org_admin', 'executive_user'], fallbackPath: '/credentials' },
  },
  {
    path: '/credentials/admin/logs',
    navbarTitle: 'Credential Manager',
    guard: { rolesAllowed: ['org_admin'], fallbackPath: '/credentials' },
  },
  {
    path: '/credentials/admin/pending',
    navbarTitle: 'Credential Manager',
    guard: { rolesAllowed: ['org_admin', 'platform_admin'], fallbackPath: '/credentials' },
  },
  { path: '/alerts', navbarTitle: 'Incidents' },
  { path: '/reviewer-inbox', navbarTitle: 'Reviewer Inbox' },
  { path: '/slos', navbarTitle: 'Stability & SLOs' },
  { path: '/audit-log', navbarTitle: 'Audit Log' },
  { path: '/baselines', navbarTitle: 'Performance Baselines' },
  { path: '/settings', navbarTitle: 'Settings' },
  // No sidebar entry: reached from the user chip at the foot of the sidebar, the
  // way an account page usually is. Every role has one of these.
  { path: '/account', navbarTitle: 'Account Settings' },
] satisfies readonly PageNavigationConfig[]
