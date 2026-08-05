// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Login } from './Login'
import { login } from '@/lib/api/user-management'
import { ApiError } from '@/lib/api/caller'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/user-management', () => ({ login: vi.fn() }))

const mockLogin = vi.mocked(login)

/**
 * A JWT whose payload is `{ email, role }`. Only the middle segment is ever read
 * (the store decodes claims for the session profile), so the header and signature
 * are filler — nothing here verifies a signature.
 */
function tokenFor(email: string, role: string) {
  const payload = btoa(JSON.stringify({ email, role })).replace(/=+$/, '')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
}

const TOKEN = tokenFor('ops@ourworldenergy.com', 'org_admin')

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    token: null,
    user: null,
    expiresAt: null,
    mustChangePassword: false,
  })
  mockLogin.mockReset()
})
afterEach(cleanup)

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<p>Dashboard</p>} />
        <Route path="/change-password" element={<p>Set a New Password</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const submit = () => screen.getByRole('button', { name: /^Login$/ }) as HTMLButtonElement

function fillAndSubmit(email = 'ops@ourworldenergy.com', password = 'hunter2!!') {
  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Secure Password/i), { target: { value: password } })
  fireEvent.click(submit())
}

describe('Login page', () => {
  it('keeps the action disabled until both fields are filled', () => {
    renderLogin()
    expect(submit().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'ops@ourworldenergy.com' },
    })
    expect(submit().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/Secure Password/i), { target: { value: 'hunter2!!' } })
    expect(submit().disabled).toBe(false)
  })

  it('stores the session and lands on the dashboard', async () => {
    mockLogin.mockResolvedValue({
      token: TOKEN,
      expires_at: '2026-08-06T01:35:22Z',
      must_change_password: false,
    })
    renderLogin()

    fillAndSubmit('  ops@ourworldenergy.com  ')

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeTruthy())
    // Whitespace is trimmed before it reaches the API.
    expect(mockLogin).toHaveBeenCalledWith('ops@ourworldenergy.com', 'hunter2!!')
    expect(localStorage.getItem('token')).toBe(TOKEN)

    // The profile comes from the token's claims — the login response has none.
    const { user, expiresAt } = useAuthStore.getState()
    expect(user).toEqual({
      email: 'ops@ourworldenergy.com',
      role: 'org_admin',
      roleLabel: 'Organizational Admin',
    })
    expect(expiresAt).toBe('2026-08-06T01:35:22Z')
  })

  it('routes to the forced screen when the password must change', async () => {
    // True for every account an admin just created, until change-password runs.
    mockLogin.mockResolvedValue({
      token: TOKEN,
      expires_at: '2026-08-06T01:35:22Z',
      must_change_password: true,
    })
    renderLogin()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByText('Set a New Password')).toBeTruthy())
    expect(screen.queryByText('Dashboard')).toBeNull()
    // The session is stored: change-password is itself a protected call.
    expect(useAuthStore.getState().token).toBe(TOKEN)
    expect(useAuthStore.getState().mustChangePassword).toBe(true)
    expect(localStorage.getItem('auth-must-change-password')).toBe('true')
  })

  it('shows the backend’s own message and stays put', async () => {
    mockLogin.mockRejectedValue(new ApiError('http', 'invalid email or password', 401))
    renderLogin()

    fillAndSubmit('a@b.com', 'wrong')

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // Shown verbatim rather than replaced with copy of our own.
    expect(screen.getByRole('alert').textContent).toMatch(/invalid email or password/i)
    expect(screen.queryByText('Dashboard')).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('surfaces a disabled account as the backend phrases it', async () => {
    mockLogin.mockRejectedValue(new ApiError('http', 'account is disabled', 403))
    renderLogin()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/account is disabled/i)
  })

  it('reveals and re-hides the password', () => {
    renderLogin()
    const field = screen.getByLabelText(/Secure Password/i) as HTMLInputElement
    expect(field.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: /Show password/i }))
    expect(field.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }))
    expect(field.type).toBe('password')
  })
})
