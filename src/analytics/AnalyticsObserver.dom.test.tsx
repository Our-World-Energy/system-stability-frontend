// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AnalyticsObserver } from './AnalyticsObserver'
import { clearAnalyticsUser, setAnalyticsUser, trackPageView } from './googleAnalytics'
import { useAuthStore } from '@/store/auth'

vi.mock('./googleAnalytics', () => ({
  setAnalyticsUser: vi.fn(),
  clearAnalyticsUser: vi.fn(),
  trackPageView: vi.fn(),
}))

const mockSetUser = vi.mocked(setAnalyticsUser)
const mockClearUser = vi.mocked(clearAnalyticsUser)
const mockPageView = vi.mocked(trackPageView)

/** A token whose payload carries the claims the backend issues. */
function tokenFor(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/=+$/, '')
  return `header.${payload}.signature`
}

function signIn(claims: Record<string, unknown>) {
  const token = tokenFor(claims)
  useAuthStore.setState({
    token,
    user: {
      email: String(claims.email ?? ''),
      role: 'org_admin',
      roleLabel: 'Organizational Admin',
    },
  })
}

function Navigator({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  )
}

function renderApp(entry = '/users') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AnalyticsObserver />
      <Routes>
        <Route path="*" element={<Navigator to="/credentials?tab=all" />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: null, user: null })
})

afterEach(cleanup)

describe('AnalyticsObserver', () => {
  it('identifies the user by the token, not by their email', () => {
    signIn({ user_id: 42, email: 'ops@ourworldenergy.com', role: 'org_admin' })
    renderApp()

    expect(mockSetUser).toHaveBeenCalledWith('42', { role: 'org_admin' })
    expect(JSON.stringify(mockSetUser.mock.calls)).not.toMatch(/@/)
  })

  it('sends one page view for the initial route', () => {
    signIn({ user_id: 42, role: 'org_admin' })
    renderApp('/users')

    // One, not two: StrictMode aside, a re-render must not re-send the route.
    expect(mockPageView).toHaveBeenCalledTimes(1)
    expect(mockPageView).toHaveBeenCalledWith('/users')
  })

  it('sends a page view when the path or the query changes', () => {
    signIn({ user_id: 42, role: 'org_admin' })
    renderApp('/users')
    mockPageView.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'go' }))

    expect(mockPageView).toHaveBeenCalledWith('/credentials?tab=all')
  })

  it('sends nothing to GA when the token carries no user id', () => {
    // The claim is the whole identity: without it there is nothing to send that
    // the backend's sync could match, and email is not an option.
    signIn({ email: 'ops@ourworldenergy.com', role: 'org_admin' })
    renderApp()

    expect(mockSetUser).not.toHaveBeenCalled()
    expect(mockClearUser).not.toHaveBeenCalled()
  })

  it('clears the identity when the session ends', () => {
    signIn({ user_id: 42, role: 'org_admin' })
    const { rerender } = renderApp()
    mockSetUser.mockClear()

    useAuthStore.setState({ token: null, user: null })
    rerender(
      <MemoryRouter initialEntries={['/users']}>
        <AnalyticsObserver />
      </MemoryRouter>,
    )

    expect(mockClearUser).toHaveBeenCalled()
  })

  it('switches identity when a second user signs in on the same tab', () => {
    signIn({ user_id: 42, role: 'org_admin' })
    const { rerender } = renderApp()
    mockSetUser.mockClear()

    signIn({ user_id: 77, role: 'standard_user' })
    rerender(
      <MemoryRouter initialEntries={['/users']}>
        <AnalyticsObserver />
      </MemoryRouter>,
    )

    expect(mockSetUser).toHaveBeenCalledWith('77', { role: 'org_admin' })
  })
})
