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

const fallback: PageMeta = { title: 'System Stability' }

/** Resolve header metadata for a pathname, falling back to a generic title. */
export function resolvePageMeta(pathname: string): PageMeta {
  const match = routes.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`))
  return match?.meta ?? fallback
}
