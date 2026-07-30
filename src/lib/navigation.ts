import type { LucideIcon } from 'lucide-react'
import { pageNavigation } from '@/config/navigation'

/*
  Sidebar navigation derived from the central page navigation config.

  The Sidebar renders this list directly, and active highlighting is derived
  automatically (the most specific route wins).
*/

export interface NavItem {
  /** Route path this link navigates to. */
  to: string
  /** Text shown next to the icon. */
  label: string
  /** lucide-react icon component. */
  icon: LucideIcon
}

export const navItems: NavItem[] = pageNavigation.flatMap((page) =>
  page.sidebar
    ? [
        {
          to: page.path,
          label: page.sidebar.label,
          icon: page.sidebar.icon,
        },
      ]
    : [],
)

/**
 * The nav item whose route best matches `pathname`. A link matches when the path
 * equals its `to` or is nested beneath it; when several match, the longest (most
 * specific) `to` wins. Returns `undefined` on routes not owned by any nav item.
 */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
}
