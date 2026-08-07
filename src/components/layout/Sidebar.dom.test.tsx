// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { navItems, navItemsForRole } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth'
import type { RoleKey } from '@/lib/api/user-management.types'
import { Sidebar } from './Sidebar'

afterEach(() => {
  cleanup()
  useAuthStore.setState({ token: null, user: null, expiresAt: null, mustChangePassword: false })
})

function renderAs(role: RoleKey | null) {
  if (role) {
    useAuthStore.setState({
      token: 'token',
      user: { email: 'someone@ourworldenergy.com', role, roleLabel: role },
      expiresAt: null,
      mustChangePassword: false,
    })
  }
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

/** Labels rendered at least once — the rail and the mobile drawer both draw them. */
function shownLabels() {
  return navItems.filter((item) => screen.queryAllByText(item.label).length > 0)
}

describe('Sidebar navigation', () => {
  it('renders every configured navigation item when no role is known', () => {
    renderAs(null)

    for (const item of navItems) {
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0)
    }
  })

  it('shows the Organizational Admin the credential admin console instead of Credentials', () => {
    renderAs('org_admin')

    expect(screen.getAllByText('Credential Admin').length).toBeGreaterThan(0)
    expect(screen.queryByText('Credentials')).toBeNull()
  })

  it('shows other roles Credentials and not the admin console', () => {
    renderAs('management_user')

    expect(screen.getAllByText('Credentials').length).toBeGreaterThan(0)
    expect(screen.queryByText('Credential Admin')).toBeNull()
  })

  it('renders exactly the items its role is allowed', () => {
    renderAs('standard_user')

    expect(shownLabels()).toEqual(navItemsForRole('standard_user'))
  })
})
