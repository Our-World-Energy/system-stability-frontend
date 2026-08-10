// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ForgotPassword } from './ForgotPassword'
import { ResetPassword } from './ResetPassword'
import { ApiError } from '@/lib/api/caller'
import { forgotPassword, resetPassword } from '@/lib/api/user-management'

vi.mock('@/lib/api/user-management', () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

const mockForgotPassword = vi.mocked(forgotPassword)
const mockResetPassword = vi.mocked(resetPassword)

const EMAIL = 'ops@ourworldenergy.com'
const TOKEN = 'reset-token-xyz'
/** The one message the backend returns for every address, real or not. */
const GENERIC = 'if an account exists for this email, a password reset link has been sent'

beforeEach(() => {
  vi.clearAllMocks()
  mockForgotPassword.mockResolvedValue(GENERIC)
  mockResetPassword.mockResolvedValue(undefined)
})
afterEach(cleanup)

function renderFlow(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillPassword(value: string, confirmation = value) {
  fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value } })
  fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
    target: { value: confirmation },
  })
}

describe('Forgot Password', () => {
  it('requests a link and shows the backend message as-is', async () => {
    renderFlow('/forgot-password')

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(mockForgotPassword).toHaveBeenCalledWith(EMAIL)
    // Shown as sent, bar the capitalised first letter.
    expect(screen.getByRole('status').textContent).toContain(GENERIC.slice(1))
  })

  it('keeps the form usable so a mistyped address can be corrected', async () => {
    renderFlow('/forgot-password')

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())

    // Editing the address drops the confirmation — it described the previous send,
    // not whatever is in the box now.
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'x@y.com' } })
    expect(screen.queryByRole('status')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }))
    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('x@y.com'))
  })

  it('reports a send failure', async () => {
    mockForgotPassword.mockRejectedValue(new ApiError('http', 'request body is required', 400))
    renderFlow('/forgot-password')

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toContain('request body is required')
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('Create a New Password', () => {
  it('refuses to render a form without a token in the URL', () => {
    renderFlow('/reset-password')

    expect(screen.getByText('Reset Link Not Valid')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Request a new link/i })).toBeTruthy()
    expect(screen.queryByLabelText(/^New Password/i)).toBeNull()
  })

  it('rejects a mismatched confirmation without calling the API', () => {
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('correct-horse', 'correct-hors')
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/Both passwords must match/i)).toBeTruthy()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('rejects a password under the minimum length', () => {
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('short')
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('commits the new password with the URL token and returns to login', async () => {
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('correct-horse')
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy())
    expect(mockResetPassword).toHaveBeenCalledWith(TOKEN, 'correct-horse')
  })

  it('sends the single-use token once however fast the button is clicked', async () => {
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('correct-horse')
    const submit = screen.getByRole('button', { name: /Reset Password/i })
    // A second call with a spent token fails as "invalid or expired", which would
    // report a failure for a reset that had in fact just succeeded.
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy())
    expect(mockResetPassword).toHaveBeenCalledTimes(1)
  })

  it('swaps the form for a request-a-new-link exit when the token is rejected', async () => {
    mockResetPassword.mockRejectedValue(new ApiError('http', 'invalid or expired token', 400))
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('correct-horse')
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => expect(screen.getByText('Reset Link Not Valid')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toContain('invalid or expired token')
    fireEvent.click(screen.getByRole('link', { name: /Request a new link/i }))
    expect(screen.getByText('Forgot Password')).toBeTruthy()
  })

  it('keeps the form for a failure the user can retry', async () => {
    mockResetPassword.mockRejectedValue(new ApiError('http', 'failed to reset password', 500))
    renderFlow(`/reset-password?token=${TOKEN}`)

    fillPassword('correct-horse')
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByLabelText(/^New Password/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))
    await waitFor(() => expect(mockResetPassword).toHaveBeenCalledTimes(2))
  })
})
