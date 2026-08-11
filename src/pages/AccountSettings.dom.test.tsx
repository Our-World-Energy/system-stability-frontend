// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AccountSettings } from './AccountSettings'
import { changePassword, getUsers } from '@/lib/api/user-management'
import type { GetUsersData, Role, UserRecord } from '@/lib/api/user-management.types'
import { ApiError } from '@/lib/api/caller'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/user-management', () => ({
  getUsers: vi.fn(),
  changePassword: vi.fn(),
}))
vi.mock('@/lib/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockGetUsers = vi.mocked(getUsers)
const mockChangePassword = vi.mocked(changePassword)

const EMAIL = 'shubham.kumar@ourworldenergy.com'

const ROLE: Role = {
  id: 2,
  key: 'platform_admin',
  name: 'Platform Admin',
  description: 'Platform Admin',
  scope_type: 'platform',
  can_rotate_credentials: true,
  can_request_rotation: false,
  rank: 80,
}

const ME: UserRecord = {
  id: 7,
  email: EMAIL,
  full_name: 'Shubham Kumar',
  phone_number: '11213314314',
  role: ROLE,
  platforms: ['aurora', 'solo'],
  status: 'active',
  must_change_password: false,
  created_at: '2026-08-05T09:43:22.163663Z',
  updated_at: '2026-08-05T09:43:22.163663Z',
}

function found(users: UserRecord[]): GetUsersData {
  return { total: users.length, page: 1, page_size: 25, users }
}

/** A token whose payload carries `claims`, shaped the way the backend issues one. */
function tokenFor(claims: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`
}

function renderPage(entry = '/account') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/login" element={<p>Sign in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    token: 'token',
    user: { email: EMAIL, role: 'platform_admin', roleLabel: 'Platform Admin' },
    expiresAt: null,
    mustChangePassword: false,
  })
  mockGetUsers.mockResolvedValue(found([ME]))
  mockChangePassword.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('Account Settings — my profile', () => {
  it('shows the registry record for the signed-in account', async () => {
    renderPage()

    // Twice over: the banner at the top and the Name field below it.
    await waitFor(() => expect(screen.getAllByText('Shubham Kumar')).toHaveLength(2))
    // Looked up by email, because the token carries no user id and there is no
    // "me" route to ask.
    expect(mockGetUsers).toHaveBeenCalledWith({ search: EMAIL, page_size: 25 })
    expect(screen.getByText('11213314314')).toBeTruthy()
    expect(screen.getByText(EMAIL)).toBeTruthy()
    expect(screen.getByText('aurora, solo')).toBeTruthy()
  })

  it('ignores a partial-match row that belongs to somebody else', async () => {
    // `search` matches substrings, so the reply can carry accounts that merely
    // look similar — attributing one of those to the user would be worse than
    // showing nothing.
    mockGetUsers.mockResolvedValue(
      found([{ ...ME, id: 9, email: `not.${EMAIL}`, full_name: 'Someone Else' }]),
    )
    renderPage()

    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled())
    expect(screen.queryByText('Someone Else')).toBeNull()
  })

  it('reads name and phone off the token when the registry is closed to this role', async () => {
    // A platform admin cannot call get-users, so claims are the only self-readable
    // source of their own details. Whichever spelling the backend picks.
    useAuthStore.setState({
      token: tokenFor({
        email: EMAIL,
        role: 'platform_admin',
        full_name: 'Shubham Kumar',
        phone: '11213314314',
      }),
    })
    mockGetUsers.mockRejectedValue(new ApiError('http', 'forbidden', 403))
    renderPage()

    await waitFor(() => expect(screen.getAllByText('Shubham Kumar').length).toBe(2))
    expect(screen.getByText('11213314314')).toBeTruthy()
    expect(screen.queryByText(/only an organizational admin can read/i)).toBeNull()
  })

  it('falls back to the session identity when the registry is closed to this role', async () => {
    // get-users is org_admin-only; a 403 is an answer, not a failure.
    mockGetUsers.mockRejectedValue(new ApiError('http', 'forbidden', 403))
    renderPage()

    await waitFor(() => expect(screen.getAllByText(/Ask an admin/i).length).toBe(2))
    // Email and role come from the token, so they are always shown — here in the
    // Email field, and again as the banner's fallback for the unavailable name.
    expect(screen.getAllByText(EMAIL).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Platform Admin').length).toBeGreaterThan(0)
    expect(screen.getByText(/only an organizational admin can read/i)).toBeTruthy()
  })

  it('offers nothing editable — the registry is where these are maintained', async () => {
    renderPage()

    await waitFor(() => expect(screen.getAllByText('Shubham Kumar').length).toBe(2))
    // update-user is a full replace of the record, role and scope included, so a
    // self-service field here would be a way to rewrite your own access.
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText(/Maintained by an organizational admin/i)).toBeTruthy()
  })
})

describe('Account Settings — reset password', () => {
  it('signs the user out and sends them to login once the password changes', async () => {
    renderPage('/account?tab=password')

    fireEvent.change(screen.getByLabelText(/^Current Password/i), {
      target: { value: 'Current@123' },
    })
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: 'Brand@New99' } })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'Brand@New99' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }))

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: 'Current@123',
        new_password: 'Brand@New99',
      }),
    )
    // The credential this session was opened with is no longer the account's.
    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy())
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('says up front that changing it ends the session', () => {
    renderPage('/account?tab=password')
    expect(screen.getByText(/signed out once the password changes/i)).toBeTruthy()
  })

  it('applies the same rules as the forced change screen', () => {
    renderPage('/account?tab=password')

    const submit = () =>
      screen.getByRole('button', { name: /Update Password/i }) as HTMLButtonElement
    expect(submit().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/^Current Password/i), { target: { value: 'same' } })
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: 'same' } })
    expect(screen.getByText(/different from your current one/i)).toBeTruthy()
    expect(submit().disabled).toBe(true)
  })

  it('opens the panel the URL asks for, and switches between the two', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'My Profile' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }))
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'My Profile' })).toBeNull()
  })
})

describe('Account Settings — logout', () => {
  it('asks before ending the session', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }))

    // Nothing has happened yet — the dialog is the whole point.
    expect(screen.getByRole('dialog', { name: /Confirm log out/i })).toBeTruthy()
    expect(useAuthStore.getState().token).toBe('token')

    fireEvent.click(screen.getByRole('button', { name: /^Log out$/i }))

    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy())
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('keeps the session when the confirmation is dismissed', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }))
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useAuthStore.getState().token).toBe('token')
  })
})
