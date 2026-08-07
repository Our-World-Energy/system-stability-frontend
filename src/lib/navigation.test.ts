import { describe, expect, it } from 'vitest'
import { pageNavigation } from '@/config/navigation'
import {
  activeNavItem,
  canRoleOpen,
  navItems,
  navItemsForRole,
  routeRedirectFor,
} from './navigation'
import { resolvePageMeta } from './page-meta'
import { ROLE_KEYS, rolesExcept } from './roles'
import type { RoleKey } from '@/lib/api/user-management.types'

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

describe('sidebar role visibility', () => {
  const pathsFor = (role: Parameters<typeof navItemsForRole>[0]) =>
    navItemsForRole(role).map((item) => item.to)

  it('swaps the credential entry for the admin console on org_admin and executive_user', () => {
    for (const role of ['org_admin', 'executive_user'] as const) {
      expect(pathsFor(role)).toContain('/credentials/admin')
      expect(pathsFor(role)).not.toContain('/credentials')
    }

    for (const role of rolesExcept('org_admin', 'executive_user')) {
      expect(pathsFor(role)).toContain('/credentials')
      expect(pathsFor(role)).not.toContain('/credentials/admin')
    }
  })

  it('shows unrestricted items to every role, and everything when no role is known', () => {
    const unrestricted = navItems.filter((item) => !item.rolesAllowed).map((item) => item.to)
    expect(unrestricted).toContain('/')

    for (const role of ROLE_KEYS) {
      expect(pathsFor(role)).toEqual(expect.arrayContaining(unrestricted))
    }

    expect(pathsFor(null)).toEqual(navItems.map((item) => item.to))
  })

  it('keeps each role in config order and highlights only its own items', () => {
    for (const role of ROLE_KEYS) {
      const items = navItemsForRole(role)
      const order = navItems.filter((item) => items.includes(item)).map((item) => item.to)
      expect(items.map((item) => item.to)).toEqual(order)
    }

    // An admin on a requester-side route lights nothing — /credentials is not in
    // their list, and highlighting never falls back to an item they cannot see.
    expect(activeNavItem('/credentials/logs', navItemsForRole('org_admin'))).toBeUndefined()
    // Everyone else keeps the nested behaviour: /credentials owns its subtree.
    expect(activeNavItem('/credentials/logs', navItemsForRole('standard_user'))?.to).toBe(
      '/credentials',
    )
  })
})

describe('route guards', () => {
  const adminRoutes = [
    '/credentials/admin',
    '/credentials/admin/logs',
    '/credentials/admin/pending',
  ]

  it('opens each guarded admin route to exactly its own roles, redirecting the rest', () => {
    // The console, the ledger and the approval queue have different audiences —
    // the nested routes declare their own guards (most-specific wins).
    const access: { path: string; allowed: RoleKey[] }[] = [
      { path: '/credentials/admin', allowed: ['org_admin', 'executive_user'] },
      { path: '/credentials/admin/logs', allowed: ['org_admin'] },
      { path: '/credentials/admin/pending', allowed: ['org_admin', 'platform_admin'] },
    ]

    for (const { path, allowed } of access) {
      for (const role of ROLE_KEYS) {
        if (allowed.includes(role)) {
          expect(canRoleOpen(path, role)).toBe(true)
          expect(routeRedirectFor(path, role)).toBeNull()
        } else {
          expect(canRoleOpen(path, role)).toBe(false)
          // Sent to the requester page they do work in, not to a dead end.
          expect(routeRedirectFor(path, role)).toBe('/credentials')
        }
      }
    }
  })

  it('leaves every other route open, including the requester pages for org_admin', () => {
    const unguarded = ['/', '/users', '/credentials', '/credentials/logs', '/settings', '/alerts']

    for (const role of ROLE_KEYS) {
      for (const path of unguarded) {
        expect(canRoleOpen(path, role)).toBe(true)
        expect(routeRedirectFor(path, role)).toBeNull()
      }
    }
  })

  it('opens everything when no role is known, so the no-auth dev shell still works', () => {
    for (const path of adminRoutes) {
      expect(canRoleOpen(path, null)).toBe(true)
      expect(routeRedirectFor(path, undefined)).toBeNull()
    }
  })

  it('never redirects to a page the role cannot open either', () => {
    for (const role of ROLE_KEYS) {
      for (const path of [...adminRoutes, '/', '/credentials', '/nope']) {
        const target = routeRedirectFor(path, role)
        if (target) expect(canRoleOpen(target, role)).toBe(true)
      }
    }
  })
})
