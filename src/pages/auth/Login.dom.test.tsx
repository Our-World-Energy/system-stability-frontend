// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Login } from './Login'
import { login } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/auth-api', () => ({
  login: vi.fn(),
  // Pass the caller's fallback straight through — message shaping is tested by
  // authErrorMessage itself, not here.
  authErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

const mockLogin = vi.mocked(login)

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null, user: null })
  mockLogin.mockReset()
})
afterEach(cleanup)

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const submit = () => screen.getByRole('button', { name: /^Login$/ }) as HTMLButtonElement

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
      token: 'jwt-abc',
      user: { email: 'ops@ourworldenergy.com', role: 'admin' },
    })
    renderLogin()

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: '  ops@ourworldenergy.com  ' },
    })
    fireEvent.change(screen.getByLabelText(/Secure Password/i), { target: { value: 'hunter2!!' } })
    fireEvent.click(submit())

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeTruthy())
    // Whitespace is trimmed before it reaches the API.
    expect(mockLogin).toHaveBeenCalledWith('ops@ourworldenergy.com', 'hunter2!!')
    expect(useAuthStore.getState().token).toBe('jwt-abc')
    expect(localStorage.getItem('token')).toBe('jwt-abc')
  })

  it('shows the failure inline and stays put', async () => {
    mockLogin.mockRejectedValue(new Error('401'))
    renderLogin()

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Secure Password/i), { target: { value: 'wrong' } })
    fireEvent.click(submit())

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/Check your email and password/i)
    expect(screen.queryByText('Dashboard')).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
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
