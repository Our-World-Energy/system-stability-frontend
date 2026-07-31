import { KeyRound, LayoutGrid, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PageNavigationConfig {
  /** Route already registered in App.tsx. */
  path: `/${string}` | '/'
  /** Title shown in the top navbar. */
  navbarTitle: string
  /** Overview-only navbar controls. */
  showSystemStats?: boolean
  /** Omit this object when the route should not appear in the sidebar. */
  sidebar?: {
    label: string
    icon: LucideIcon
  }
}

/**
 * Single source of truth for sidebar items and navbar titles.
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
    path: '/credentials',
    navbarTitle: 'Credential Manager',
    sidebar: { label: 'Credentials', icon: KeyRound },
  },
  { path: '/credentials/logs', navbarTitle: 'Credential Manager' },
  {
    path: '/credentials/admin',
    navbarTitle: 'Credential Manager',
    sidebar: { label: 'Credential Admin', icon: ShieldCheck },
  },
  { path: '/credentials/admin/logs', navbarTitle: 'Credential Manager' },
  { path: '/credentials/admin/pending', navbarTitle: 'Credential Manager' },
  { path: '/alerts', navbarTitle: 'Incidents' },
  { path: '/reviewer-inbox', navbarTitle: 'Reviewer Inbox' },
  { path: '/slos', navbarTitle: 'Stability & SLOs' },
  { path: '/audit-log', navbarTitle: 'Audit Log' },
  { path: '/baselines', navbarTitle: 'Performance Baselines' },
  { path: '/settings', navbarTitle: 'Settings' },
] satisfies readonly PageNavigationConfig[]
