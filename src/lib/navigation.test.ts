import { describe, expect, it } from 'vitest'
import { pageNavigation } from '@/config/navigation'
import { activeNavItem, navItems } from './navigation'
import { resolvePageMeta } from './page-meta'

describe('navigation configuration', () => {
  it('defines unique route paths', () => {
    const paths = pageNavigation.map((page) => page.path)
    expect(paths.length).toBeGreaterThan(0)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('generates configured sidebar items in array order', () => {
    const expected = pageNavigation.flatMap((page) =>
      page.sidebar ? [{ to: page.path, label: page.sidebar.label }] : [],
    )

    expect(navItems.map(({ to, label }) => ({ to, label }))).toEqual(expected)
  })

  it('resolves each page title and the most-specific active navigation', () => {
    for (const page of pageNavigation) {
      expect(resolvePageMeta(page.path).title).toBe(page.navbarTitle)
    }

    expect(activeNavItem('/credentials/logs')?.to).toBe('/credentials')
    expect(activeNavItem('/credentials/admin/logs')?.to).toBe('/credentials/admin')
  })
})
