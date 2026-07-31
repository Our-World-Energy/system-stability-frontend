import { pageNavigation } from '@/config/navigation'

/*
  Per-route header metadata derived from the central page navigation config.
*/

export interface PageMeta {
  /** Title shown in the top navbar. */
  title: string
  /** Show the live system-status counters — only meaningful on the Overview. */
  showSystemStats?: boolean
}

/** Ordered most-specific first so nested routes win over their parents. */
const routes: { path: string; meta: PageMeta }[] = pageNavigation
  .map((page) => ({
    path: page.path,
    meta: {
      title: page.navbarTitle,
      showSystemStats: page.showSystemStats,
    },
  }))
  .sort((a, b) => b.path.length - a.path.length)
/** Ordered most-specific first; `/` matches only exactly, so it can sit last. */
const routes: { path: string; meta: PageMeta }[] = [
  { path: '/credentials/admin/logs', meta: { title: 'Credential Manager' } },
  { path: '/credentials/admin/pending', meta: { title: 'Credential Manager' } },
  { path: '/credentials/admin', meta: { title: 'Credential Manager' } },
  { path: '/credentials/logs', meta: { title: 'Credential Manager' } },
  { path: '/credentials', meta: { title: 'Credential Manager' } },
  { path: '/users', meta: { title: 'User Management' } },
  { path: '/alerts', meta: { title: 'Incidents' } },
  { path: '/reviewer-inbox', meta: { title: 'Reviewer Inbox' } },
  { path: '/slos', meta: { title: 'Stability & SLOs' } },
  { path: '/audit-log', meta: { title: 'Audit Log' } },
  { path: '/baselines', meta: { title: 'Performance Baselines' } },
  { path: '/settings', meta: { title: 'Settings' } },
  { path: '/', meta: { title: 'System Visibility', showSystemStats: true } },
]

const fallback: PageMeta = { title: 'System Stability' }

/** Resolve header metadata for a pathname, falling back to a generic title. */
export function resolvePageMeta(pathname: string): PageMeta {
  const match = routes.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`))
  return match?.meta ?? fallback
}
