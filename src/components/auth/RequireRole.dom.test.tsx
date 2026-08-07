// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { RoleKey } from '@/lib/api/user-management.types'
import { RequireRole } from './RequireRole'

afterEach(() => {
  cleanup()
  useAuthStore.setState({ token: null, user: null, expiresAt: null, mustChangePassword: false })
})

/**
 * The guard under the real route table, with stand-ins for the pages — this is about
 * which route wins, not what those pages render.
 */
function renderAt(path: string, role: RoleKey | null) {
  if (role) {
    useAuthStore.setState({
      token: 'token',
      user: { email: 'someone@ourworldenergy.com', role, roleLabel: role },
      expiresAt: null,
      mustChangePassword: false,
    })
  }
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireRole />}>
          <Route index element={<p>overview</p>} />
          <Route path="credentials" element={<p>requester credential manager</p>} />
          <Route path="credentials/admin" element={<p>credential admin console</p>} />
          <Route path="credentials/admin/pending" element={<p>pending approvals</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('lets the Organizational Admin into the admin console', () => {
    renderAt('/credentials/admin', 'org_admin')
    expect(screen.getByText('credential admin console')).toBeTruthy()
  })

  it('sends every other role from the admin console to the requester page', () => {
    renderAt('/credentials/admin', 'management_user')
    expect(screen.getByText('requester credential manager')).toBeTruthy()
    expect(screen.queryByText('credential admin console')).toBeNull()
  })

  it('guards the nested admin routes the same way', () => {
    renderAt('/credentials/admin/pending', 'standard_user')
    expect(screen.getByText('requester credential manager')).toBeTruthy()
    expect(screen.queryByText('pending approvals')).toBeNull()
  })

  it('leaves the requester page reachable for every role', () => {
    renderAt('/credentials', 'org_admin')
    expect(screen.getByText('requester credential manager')).toBeTruthy()
  })

  it('renders unguarded routes untouched when there is no session', () => {
    renderAt('/', null)
    expect(screen.getByText('overview')).toBeTruthy()
  })
})
