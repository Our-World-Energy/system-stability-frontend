// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ForgotPassword } from './ForgotPassword'
import { VerifyOtp } from './VerifyOtp'
import { ResetPassword } from './ResetPassword'
import { requestPasswordOtp, resetPassword, verifyPasswordOtp } from '@/lib/auth-api'
import { readResetFlow, startResetFlow, setResetToken } from '@/lib/auth-flow'

vi.mock('@/lib/auth-api', () => ({
  requestPasswordOtp: vi.fn(),
  verifyPasswordOtp: vi.fn(),
  resetPassword: vi.fn(),
  authErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

const mockRequestOtp = vi.mocked(requestPasswordOtp)
const mockVerifyOtp = vi.mocked(verifyPasswordOtp)
const mockResetPassword = vi.mocked(resetPassword)

const EMAIL = 'ops@ourworldenergy.com'

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mockRequestOtp.mockResolvedValue(undefined)
  mockVerifyOtp.mockResolvedValue('reset-token-xyz')
  mockResetPassword.mockResolvedValue(undefined)
})
afterEach(cleanup)

function renderFlow(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Fill all six boxes at once, the way a paste behaves. */
function enterCode(code: string) {
  fireEvent.change(screen.getByLabelText('Digit 1 of 6'), { target: { value: code } })
}

describe('Forgot Password', () => {
  it('requests a code, records the flow, and moves to verification', async () => {
    renderFlow('/forgot-password')

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole('button', { name: /Request OTP/i }))

    await waitFor(() => expect(screen.getByText('OTP Verification')).toBeTruthy())
    expect(mockRequestOtp).toHaveBeenCalledWith(EMAIL)
    expect(readResetFlow()?.email).toBe(EMAIL)
  })

  it('reports a send failure instead of advancing', async () => {
    mockRequestOtp.mockRejectedValue(new Error('boom'))
    renderFlow('/forgot-password')

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole('button', { name: /Request OTP/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText('OTP Verification')).toBeNull()
    expect(readResetFlow()).toBeNull()
  })
})

describe('OTP Verification', () => {
  it('sends deep links back to the start when no flow is in progress', () => {
    renderFlow('/verify-otp')
    expect(screen.getByText('Forgot Password')).toBeTruthy()
  })

  it('shows the target address and the expiry countdown', () => {
    startResetFlow(EMAIL)
    renderFlow('/verify-otp')

    expect(screen.getByText(EMAIL)).toBeTruthy()
    expect(screen.getByText('02:00')).toBeTruthy()
  })

  it('verifies a complete code and advances to the new-password step', async () => {
    startResetFlow(EMAIL)
    renderFlow('/verify-otp')

    enterCode('481902')

    await waitFor(() => expect(screen.getByText('Create a New Password')).toBeTruthy())
    expect(mockVerifyOtp).toHaveBeenCalledWith(EMAIL, '481902')
    expect(readResetFlow()?.resetToken).toBe('reset-token-xyz')
  })

  it('clears a rejected code so it can be retyped', async () => {
    mockVerifyOtp.mockRejectedValue(new Error('bad code'))
    startResetFlow(EMAIL)
    renderFlow('/verify-otp')

    enterCode('000000')

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect((screen.getByLabelText('Digit 1 of 6') as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('Create a New Password')).toBeNull()
  })

  it('resend issues a fresh code', async () => {
    startResetFlow(EMAIL)
    renderFlow('/verify-otp')

    fireEvent.click(screen.getByRole('button', { name: /Resend Code/i }))

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith(EMAIL))
  })
})

describe('Create a New Password', () => {
  it('refuses to render without a verified reset token', () => {
    startResetFlow(EMAIL) // Flow exists, but the OTP was never verified.
    renderFlow('/reset-password')
    expect(screen.getByText('Forgot Password')).toBeTruthy()
  })

  it('rejects a mismatched confirmation without calling the API', () => {
    startResetFlow(EMAIL)
    setResetToken('reset-token-xyz')
    renderFlow('/reset-password')

    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'correct-horse' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'correct-hors' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/Both passwords must match/i)).toBeTruthy()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('rejects a password under the minimum length', () => {
    startResetFlow(EMAIL)
    setResetToken('reset-token-xyz')
    renderFlow('/reset-password')

    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('commits the new password, clears the flow, and returns to login', async () => {
    startResetFlow(EMAIL)
    setResetToken('reset-token-xyz')
    renderFlow('/reset-password')

    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'correct-horse' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy())
    expect(mockResetPassword).toHaveBeenCalledWith('reset-token-xyz', 'correct-horse')
    expect(readResetFlow()).toBeNull()
  })
})
