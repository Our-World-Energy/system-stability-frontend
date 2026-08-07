// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ChangePassword } from './ChangePassword'
import { changePassword } from '@/lib/api/user-management'
import { ApiError } from '@/lib/api/caller'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/user-management', () => ({ changePassword: vi.fn() }))

const mockChangePassword = vi.mocked(changePassword)

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    token: 'token',
    user: {
      email: 'new.user@ourworldenergy.com',
      role: 'standard_user',
      roleLabel: 'Standard User',
    },
    expiresAt: null,
    // The account an admin just created: blocked until this screen succeeds.
    mustChangePassword: true,
  })
  mockChangePassword.mockReset()
})
afterEach(cleanup)

function renderScreen(state?: { from?: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/change-password', state }]}>
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<p>Dashboard</p>} />
        <Route path="/settings" element={<p>Settings</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const currentField = () => screen.getByLabelText(/Current Password/i) as HTMLInputElement
const newField = () => screen.getByLabelText(/^New Password/i) as HTMLInputElement
const confirmField = () => screen.getByLabelText(/Confirm New Password/i) as HTMLInputElement
const submit = () => screen.getByRole('button', { name: /Update Password/i }) as HTMLButtonElement

function fillAll(current = 'Welcome@123', next = 'NewSecure@456', confirm = next) {
  fireEvent.change(currentField(), { target: { value: current } })
  fireEvent.change(newField(), { target: { value: next } })
  fireEvent.change(confirmField(), { target: { value: confirm } })
}

describe('ChangePassword', () => {
  it('explains why the user is here when the change is forced', () => {
    renderScreen()
    expect(screen.getByText(/Set a New Password/i)).toBeTruthy()
    expect(screen.getByText(/temporary password/i)).toBeTruthy()
    // change-password always acts on the caller's own account, so it says whose.
    expect(screen.getByText('new.user@ourworldenergy.com')).toBeTruthy()
  })

  it('enforces the backend’s own rules before spending a request', () => {
    renderScreen()
    expect(submit().disabled).toBe(true)

    // Under 8 characters.
    fillAll('Welcome@123', 'short', 'short')
    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy()
    expect(submit().disabled).toBe(true)

    // Same as the current one.
    fillAll('Welcome@123', 'Welcome@123', 'Welcome@123')
    expect(screen.getByText(/different from your current one/i)).toBeTruthy()
    expect(submit().disabled).toBe(true)

    // Confirmation does not match.
    fillAll('Welcome@123', 'NewSecure@456', 'NewSecure@457')
    expect(screen.getByText(/must match/i)).toBeTruthy()
    expect(submit().disabled).toBe(true)

    fillAll()
    expect(submit().disabled).toBe(false)
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('clears the rejected current password and refocuses it, keeping the new one', async () => {
    mockChangePassword.mockRejectedValue(
      new ApiError('http', 'current password is incorrect', 400),
    )
    renderScreen()
    fillAll('WrongPass@1', 'NewSecure@456')
    fireEvent.click(submit())

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // The backend's wording, shown as-is.
    expect(screen.getByRole('alert').textContent).toMatch(/current password is incorrect/i)

    // The credential that was checked is cleared and focused…
    expect(currentField().value).toBe('')
    expect(document.activeElement).toBe(currentField())
    // …while the password the user chose survives, so it is not typed twice again.
    expect(newField().value).toBe('NewSecure@456')
    expect(confirmField().value).toBe('NewSecure@456')

    // Usable again rather than stuck pending.
    expect(submit().disabled).toBe(true) // current is empty
    fireEvent.change(currentField(), { target: { value: 'Welcome@123' } })
    expect(submit().disabled).toBe(false)
  })

  it('sends the two passwords and unblocks the app on success', async () => {
    mockChangePassword.mockResolvedValue(undefined)
    renderScreen()
    fillAll()
    fireEvent.click(submit())

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeTruthy())
    expect(mockChangePassword).toHaveBeenCalledWith({
      current_password: 'Welcome@123',
      new_password: 'NewSecure@456',
    })
    // must_change_password is false server-side now; mirroring it locally is what
    // stops RequireAuth funnelling every route back to this screen.
    expect(useAuthStore.getState().mustChangePassword).toBe(false)
    expect(localStorage.getItem('auth-must-change-password')).toBe('false')
  })

  it('returns to where it was opened from, for a voluntary change', async () => {
    // Linked from Settings, which passes itself as the return path.
    useAuthStore.setState({ mustChangePassword: false })
    mockChangePassword.mockResolvedValue(undefined)
    renderScreen({ from: '/settings' })

    expect(screen.getByText(/^Change Password$/i)).toBeTruthy()
    fillAll()
    fireEvent.click(submit())

    await waitFor(() => expect(screen.getByText('Settings')).toBeTruthy())
  })
})
