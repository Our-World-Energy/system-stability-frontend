// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { navItems, navItemsForRole } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import type { RoleKey } from '@/lib/api/user-management.types'
import { Sidebar } from './Sidebar'

afterEach(() => {
  cleanup()
  useSidebarStore.setState({ mobileOpen: false })
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

describe('Sidebar user chip', () => {
  it('links the chip to the account page and labels it on hover', () => {
    renderAs('standard_user')

    // Two rails render — the desktop one and the mobile drawer — so both chips
    // are present; either is enough to prove the wiring.
    const links = screen.getAllByRole('link', { name: /someone@ourworldenergy.com/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute('href')).toBe('/account')
    expect(screen.getAllByRole('tooltip')[0].textContent).toContain('My Account')
  })

  it('confirms before logging out, and does nothing until confirmed', () => {
    renderAs('standard_user')

    fireEvent.click(screen.getAllByRole('button', { name: /Log out/i })[0])

    const dialog = screen.getByRole('dialog', { name: /Confirm log out/i })
    expect(useAuthStore.getState().token).toBe('token')

    fireEvent.click(within(dialog).getByRole('button', { name: /^Log out$/i }))
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('Sidebar mobile drawer', () => {
  it('closes itself when the account chip is used', () => {
    // The drawer overlays the page it navigates to, so nothing else dismisses it —
    // the nav links call this too.
    useSidebarStore.setState({ mobileOpen: true })
    renderAs('standard_user')

    // The drawer's chip is the last one rendered; the desktop rail draws the first.
    const links = screen.getAllByRole('link', { name: /someone@ourworldenergy.com/i })
    fireEvent.click(links[links.length - 1])

    expect(useSidebarStore.getState().mobileOpen).toBe(false)
  })

  it('closes itself on the way out of a sign-out', () => {
    // mobileOpen is not persisted but does outlive a client-side navigation, so a
    // drawer left open would still be open at the next sign-in.
    useSidebarStore.setState({ mobileOpen: true })
    renderAs('standard_user')

    const buttons = screen.getAllByRole('button', { name: /Log out/i })
    fireEvent.click(buttons[buttons.length - 1])
    const dialog = screen.getByRole('dialog', { name: /Confirm log out/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Log out$/i }))

    expect(useSidebarStore.getState().mobileOpen).toBe(false)
  })
})
