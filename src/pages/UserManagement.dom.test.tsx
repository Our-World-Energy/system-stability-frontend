// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UserManagement } from './UserManagement'
import {
  createUser,
  deleteUser,
  getActiveUserStats,
  getMetadata,
  getUsers,
  updateUser,
} from '@/lib/api/user-management'
import type {
  ActiveUserStatsData,
  GetUsersData,
  MetadataData,
  Role,
  UserRecord,
} from '@/lib/api/user-management.types'
import { ApiError } from '@/lib/api/caller'
import { notify } from '@/lib/notify'
import { activeUsersSeries, isoDay, parseIsoDay } from '@/lib/active-users-data'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/user-management', () => ({
  getMetadata: vi.fn(),
  getUsers: vi.fn(),
  getActiveUserStats: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))
// Toasts are asserted in the hooks' own right; here they would just be noise.
vi.mock('@/lib/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockNotify = vi.mocked(notify)
const mockGetMetadata = vi.mocked(getMetadata)
const mockGetUsers = vi.mocked(getUsers)
const mockGetActiveUserStats = vi.mocked(getActiveUserStats)
const mockCreateUser = vi.mocked(createUser)
const mockUpdateUser = vi.mocked(updateUser)
const mockDeleteUser = vi.mocked(deleteUser)

const PAGE_SIZE = 5
const ADMIN_EMAIL = 'bootstrap.admin@ourworldenergy.com'

function role(key: Role['key'], name: string, rank: number, extra: Partial<Role> = {}): Role {
  return {
    id: rank,
    key,
    name,
    description: `${name} description`,
    scope_type: 'all',
    can_rotate_credentials: false,
    can_request_rotation: false,
    rank,
    user_count: 1,
    ...extra,
  }
}

/**
 * Stands in for get-metadata. The platforms are real catalog keys — the point of
 * driving the form from this call is that the old fixture's AWS/Datadog/GitHub
 * names were never platforms this system tracks.
 */
const METADATA: MetadataData = {
  roles: [
    role('org_admin', 'Organizational Admin', 100, {
      can_rotate_credentials: true,
      user_count: 2,
    }),
    role('platform_admin', 'Platform Admin', 80, {
      scope_type: 'platform',
      can_rotate_credentials: true,
    }),
    role('dev_admin', 'Dev Admin', 60, {
      scope_type: 'development',
      can_rotate_credentials: true,
    }),
    role('executive_user', 'Executive User', 50, { can_request_rotation: true }),
    role('management_user', 'Management User', 40, {
      scope_type: 'department',
      can_request_rotation: true,
    }),
    role('standard_user', 'Standard User', 20, { scope_type: 'department', user_count: 9 }),
  ],
  departments: [
    {
      id: 8,
      name: 'Sales',
      sub_departments: [
        { id: 30, department_id: 8, name: 'Business Development' },
        { id: 31, department_id: 8, name: 'Partner Success' },
        { id: 32, department_id: 8, name: 'Sales Operations' },
      ],
    },
    {
      id: 9,
      name: 'Technology',
      sub_departments: [{ id: 36, department_id: 9, name: 'Technology' }],
    },
  ],
  platforms: [
    { id: 1, key: 'aurora', name: 'Aurora Solar' },
    { id: 2, key: 'solo', name: 'Solo' },
    { id: 13, key: 'tape', name: 'Tape' },
  ],
}

function user(overrides: Partial<UserRecord> & { id: number }): UserRecord {
  return {
    email: `user${overrides.id}@ourworldenergy.com`,
    full_name: `User ${overrides.id}`,
    role: METADATA.roles[5], // standard_user
    status: 'active',
    must_change_password: false,
    created_at: '2026-08-05T09:43:22.163663Z',
    updated_at: '2026-08-05T09:43:22.163663Z',
    ...overrides,
  }
}

/** 14 users total, five per page — the registry pages three deep. */
const ALL_USERS: UserRecord[] = [
  user({
    id: 1,
    full_name: 'Bootstrap Admin',
    email: ADMIN_EMAIL,
    role: METADATA.roles[0],
  }),
  user({
    id: 2,
    full_name: 'Alice Schmidt',
    email: 'alice.schmidt@ourworldenergy.com',
    role: METADATA.roles[1],
    platforms: ['aurora', 'solo'],
  }),
  user({
    id: 3,
    full_name: 'Priya Raman',
    email: 'priya.raman@ourworldenergy.com',
    role: METADATA.roles[4],
    department: { id: 9, name: 'Technology' },
    sub_departments: [{ id: 36, department_id: 9, name: 'Technology' }],
  }),
  // A stored number that does not pass the current rule — the registry predates
  // it. Opening this row's edit dialog must show the problem where it happened.
  user({ id: 4, phone_number: '12345' }),
  ...Array.from({ length: 10 }, (_, i) => user({ id: i + 5 })),
]

/** Slice ALL_USERS the way get-users would, so paging assertions are meaningful. */
function page(params: { page?: number; page_size?: number }): GetUsersData {
  const p = params.page ?? 1
  const size = params.page_size ?? 25
  return {
    total: ALL_USERS.length,
    page: p,
    page_size: size,
    users: ALL_USERS.slice((p - 1) * size, p * size),
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/login" element={<p>Sign in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * A stats reply for whatever range was asked for: one point per day, counting up
 * from 100 so each bucket is distinguishable in the hover readout.
 */
function activeStats({ start_date, end_date }: { start_date: string; end_date: string }) {
  const days: string[] = []
  // Local days throughout — `toISOString()` here would shift every date by one
  // in any timezone east of Greenwich.
  for (let d = parseIsoDay(start_date)!; isoDay(d) <= end_date; d.setDate(d.getDate() + 1)) {
    days.push(isoDay(d))
  }
  const daily = days.map((date, i) => ({ date, active_users: 100 + i * 10 }))

  const stats: ActiveUserStatsData = {
    start_date,
    end_date,
    average_daily_active_users: 128,
    peak_daily_active_users: 190,
    percent_change_vs_previous_period: 2.1,
    daily,
    previous_period_daily: daily.map((point) => ({
      ...point,
      active_users: point.active_users - 5,
    })),
  }
  return stats
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    token: 'token',
    user: {
      email: ADMIN_EMAIL,
      role: 'org_admin',
      roleLabel: 'Organizational Admin',
    },
    expiresAt: null,
    mustChangePassword: false,
  })
  mockGetMetadata.mockResolvedValue(METADATA)
  mockGetUsers.mockImplementation(async (params = {}) => page(params))
  mockGetActiveUserStats.mockImplementation(async (range) => activeStats(range))
})
afterEach(cleanup)

function registryRows() {
  // Named, because the page also renders the role access matrix table.
  return within(screen.getByRole('table', { name: 'User Registry' }))
    .getAllByRole('row')
    .slice(1)
}

/**
 * Wait for the first get-users response to paint.
 *
 * Given a longer window than the 1s default: this is the widest file in the suite
 * and the page now runs three queries at once, so on a loaded machine the first
 * rows can miss a one-second deadline while the table is still on its loading row.
 * A slow paint is not the failure any of these tests are looking for.
 */
async function waitForRegistry() {
  await waitFor(() => expect(registryRows().length).toBe(PAGE_SIZE), { timeout: 5000 })
}

async function openAddUser() {
  await waitForRegistry()
  fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
  fireEvent.change(screen.getByLabelText(/full_name/i), { target: { value: 'Nadia Rahman' } })
  fireEvent.change(screen.getByLabelText(/email_address/i), {
    target: { value: 'nadia.rahman@ourworldenergy.com' },
  })
}

const chooseRole = (name: string) =>
  fireEvent.change(screen.getByRole('combobox', { name: /^role$/i }), {
    target: { value: name },
  })

const createButton = () => screen.getByRole('button', { name: /Create User/i }) as HTMLButtonElement

describe('User Management — registry', () => {
  it('renders the first page from get-users with the filtered total', async () => {
    renderPage()
    await waitForRegistry()

    // The page renders no heading of its own — the navbar owns the title.
    expect(screen.queryByText('User Management')).toBeNull()
    expect(screen.getByText('User Registry')).toBeTruthy()
    expect(screen.getByText(`Showing ${PAGE_SIZE} of ${ALL_USERS.length} users`)).toBeTruthy()
    expect(screen.getByText('Bootstrap Admin')).toBeTruthy()

    // Defaults are sent explicitly rather than relying on the server's page 1 / 25.
    expect(mockGetUsers).toHaveBeenCalledWith({ page: 1, page_size: PAGE_SIZE })
  })

  it('asks the server for the next page rather than slicing locally', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenCalledWith({ page: 2, page_size: PAGE_SIZE }),
    )
    // Pagination is driven by the API's own total, not by the rows on screen.
    expect(screen.getAllByRole('button', { name: /^[0-9]+$/ }).length).toBeLessThanOrEqual(3)
  })

  it('sends the search term once typing settles', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.change(screen.getByRole('searchbox', { name: /Search registry/i }), {
      target: { value: 'jane' },
    })

    // One field covers full_name and email, so there is a single `search` param.
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenCalledWith({
        page: 1,
        page_size: PAGE_SIZE,
        search: 'jane',
      }),
    )
  })

  it('sends role keys, not display names, when filtering', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Filter registry by role/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Standard User' }))

    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenCalledWith({
        page: 1,
        page_size: PAGE_SIZE,
        roles: ['standard_user'],
      }),
    )

    // Checking a second role widens the filter rather than replacing it.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Executive User' }))
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenCalledWith({
        page: 1,
        page_size: PAGE_SIZE,
        roles: ['standard_user', 'executive_user'],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Clear filter/i }))
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenLastCalledWith({ page: 1, page_size: PAGE_SIZE }),
    )
  })

  it('returns to the first page when a filter narrows the list', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenCalledWith({ page: 2, page_size: PAGE_SIZE }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Filter registry by role/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Organizational Admin' }))

    // Page 2 of a one-row result would be empty, so the request resets to page 1.
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: PAGE_SIZE,
        roles: ['org_admin'],
      }),
    )
  })

  it('shows each role’s scope in the row it applies to', async () => {
    renderPage()
    await waitForRegistry()

    // Platform admin: platform keys, no department.
    const platformRow = screen.getByText('Alice Schmidt').closest('tr')!
    expect(within(platformRow).getByText('aurora, solo')).toBeTruthy()

    // Department role: department, with its sub-departments beneath.
    const deptRow = screen.getByText('Priya Raman').closest('tr')!
    expect(within(deptRow).getAllByText('Technology').length).toBeGreaterThan(0)
  })
})

describe('User Management — empty states', () => {
  /** get-users answering with nothing, whatever was asked for. */
  function noResults() {
    mockGetUsers.mockImplementation(async (params = {}) => ({
      total: 0,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGE_SIZE,
      users: [],
    }))
  }

  it('offers a way out when filters match nothing', async () => {
    renderPage()
    await waitForRegistry()

    noResults()
    fireEvent.change(screen.getByRole('searchbox', { name: /Search registry/i }), {
      target: { value: 'zzz-no-such-user' },
    })

    await waitFor(() =>
      expect(screen.getByText(/No users match this search or filter/i)).toBeTruthy(),
    )
    // The recovery action is in the empty state itself, not buried at the bottom of
    // the filter dropdown where a short table used to clip it off.
    expect(screen.getByRole('button', { name: /Clear filters/i })).toBeTruthy()
  })

  it('clearing from the empty state drops the search and the role filter together', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Filter registry by role/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Standard User' }))
    fireEvent.click(screen.getByRole('button', { name: /Filter registry by role/i })) // close

    noResults()
    fireEvent.change(screen.getByRole('searchbox', { name: /Search registry/i }), {
      target: { value: 'zzz' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: /Clear filters/i })).toBeTruthy())

    mockGetUsers.mockImplementation(async (params = {}) => page(params))
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }))

    // Back to an unfiltered request — both the search box and the role filter reset.
    await waitFor(() =>
      expect(mockGetUsers).toHaveBeenLastCalledWith({ page: 1, page_size: PAGE_SIZE }),
    )
    expect(
      (screen.getByRole('searchbox', { name: /Search registry/i }) as HTMLInputElement).value,
    ).toBe('')
    await waitFor(() => expect(registryRows().length).toBe(PAGE_SIZE))
  })

  it('invites the first user when the registry is genuinely empty', async () => {
    noResults()
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/No users have been provisioned yet/i)).toBeTruthy(),
    )
    // Nothing is filtered, so clearing filters would be meaningless — it offers the
    // only action that helps instead.
    expect(screen.queryByRole('button', { name: /Clear filters/i })).toBeNull()

    // And it opens the same dialog as the header button.
    const addButtons = screen.getAllByRole('button', { name: /Add User/i })
    fireEvent.click(addButtons[addButtons.length - 1])
    expect(screen.getByLabelText(/full_name/i)).toBeTruthy()
  })
})

describe('User Management — create', () => {
  it('sends department and sub_departments for a department role, and no platforms', async () => {
    renderPage()
    await openAddUser()

    // Scope controls only exist once a role that uses them is chosen.
    expect(screen.queryByRole('combobox', { name: /^department$/i })).toBeNull()
    chooseRole('standard_user')

    fireEvent.change(screen.getByRole('combobox', { name: /^department$/i }), {
      target: { value: 'Sales' },
    })
    // Sub-departments are optional for both department roles, so a department alone
    // already completes the form.
    expect(createButton().disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /sub_departments/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Partner Success' }))
    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    const payload = mockCreateUser.mock.calls[0][0]
    expect(payload).toEqual({
      email: 'nadia.rahman@ourworldenergy.com',
      full_name: 'Nadia Rahman',
      role: 'standard_user',
      department: 'Sales',
      sub_departments: ['Partner Success'],
    })
    expect('platforms' in payload).toBe(false)
  })

  it('sends platform keys for a platform admin, and no department', async () => {
    renderPage()
    await openAddUser()
    chooseRole('platform_admin')

    expect(screen.queryByRole('combobox', { name: /^department$/i })).toBeNull()
    // An admin scoped to no platform would hold no access, so it stays blocked.
    expect(createButton().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /platform_access/i }))
    // The dropdown lists the real catalog, by display name…
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aurora Solar' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tape' }))
    expect(createButton().disabled).toBe(false)

    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    const payload = mockCreateUser.mock.calls[0][0]
    // …and sends keys, because a display name is a 400.
    expect(payload.platforms).toEqual(['aurora', 'tape'])
    expect('department' in payload).toBe(false)
    expect('sub_departments' in payload).toBe(false)
  })

  it('omits every scope field for an org-wide role', async () => {
    renderPage()
    await openAddUser()
    chooseRole('executive_user')

    expect(screen.queryByRole('combobox', { name: /^department$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /platform_access/i })).toBeNull()
    expect(createButton().disabled).toBe(false)

    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    expect(mockCreateUser.mock.calls[0][0]).toEqual({
      email: 'nadia.rahman@ourworldenergy.com',
      full_name: 'Nadia Rahman',
      role: 'executive_user',
    })
  })

  it('drops the scope a role no longer uses when the role changes', async () => {
    renderPage()
    await openAddUser()

    chooseRole('platform_admin')
    fireEvent.click(screen.getByRole('button', { name: /platform_access/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aurora Solar' }))
    expect(screen.getByRole('checkbox', { name: 'Aurora Solar' })).toHaveProperty('checked', true)

    chooseRole('dev_admin')
    expect(screen.queryByRole('checkbox', { name: 'Aurora Solar' })).toBeNull()

    // Coming back offers a clean slate rather than the earlier grant.
    chooseRole('platform_admin')
    fireEvent.click(screen.getByRole('button', { name: /platform_access/i }))
    expect(screen.getByRole('checkbox', { name: 'Aurora Solar' })).toHaveProperty('checked', false)
  })

  it('resets sub-departments when the department changes', async () => {
    renderPage()
    await openAddUser()
    chooseRole('management_user')

    const subDepartments = () => screen.getByRole('button', { name: /sub_departments/i })
    // Disabled until a department narrows the list — the names are only unique
    // within one department.
    expect(subDepartments()).toHaveProperty('disabled', true)

    fireEvent.change(screen.getByRole('combobox', { name: /^department$/i }), {
      target: { value: 'Sales' },
    })
    fireEvent.click(subDepartments())
    expect(screen.getAllByRole('checkbox').map((c) => c.parentElement?.textContent)).toEqual([
      'Business Development',
      'Partner Success',
      'Sales Operations',
    ])

    fireEvent.click(screen.getByRole('checkbox', { name: 'Partner Success' }))
    fireEvent.change(screen.getByRole('combobox', { name: /^department$/i }), {
      target: { value: 'Technology' },
    })

    fireEvent.click(createButton())
    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    // The stale sub-department is gone rather than shipped against the new
    // department, which would be a 400.
    const payload = mockCreateUser.mock.calls[0][0]
    expect(payload.department).toBe('Technology')
    expect('sub_departments' in payload).toBe(false)
  })
})

describe('User Management — add-user field validation', () => {
  /** Type into a field and leave it, which is when its message appears. */
  function fill(labelPattern: RegExp, value: string) {
    const input = screen.getByLabelText(labelPattern)
    fireEvent.change(input, { target: { value } })
    fireEvent.blur(input)
    return input
  }

  it('hints while typing, and only flags the field once it is left', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    const name = screen.getByLabelText(/full_name/i)
    // Blank form: the summary explains why Create is disabled.
    expect(screen.getByText(/enter the user’s full name/i)).toBeTruthy()

    fireEvent.change(name, { target: { value: 'Elias 2' } })
    // Mid-typing the problem is named in the muted summary, but the control is not
    // yet marked invalid — no red message under a field someone is still filling in.
    expect(screen.getByText(/cannot contain numbers/i)).toBeTruthy()
    expect(name.getAttribute('aria-invalid')).toBeNull()
    expect(document.getElementById('user-name-error')).toBeNull()

    fireEvent.blur(name)
    // Now it is flagged inline, and the summary drops it rather than repeating it.
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById('user-name-error')!.textContent).toMatch(
      /cannot contain numbers/i,
    )
    expect(screen.getAllByText(/cannot contain numbers/i)).toHaveLength(1)
  })

  it('rejects a name that starts with a space, has a digit, or has a symbol', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    fill(/full_name/i, ' Elias')
    expect(screen.getByText(/name cannot start with a space/i)).toBeTruthy()

    fill(/full_name/i, 'Elias2')
    expect(screen.getByText(/name cannot contain numbers/i)).toBeTruthy()

    fill(/full_name/i, 'Elias@Thorne')
    expect(screen.getByText(/name cannot contain special characters/i)).toBeTruthy()

    // A legitimate hyphenated name is accepted, and the message clears.
    fill(/full_name/i, 'Jonathan Doe-Reid')
    expect(screen.queryByText(/name cannot/i)).toBeNull()
  })

  it('rejects a phone number containing anything but digits and phone punctuation', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    fill(/phone_number/i, ' 555')
    expect(screen.getByText(/phone number cannot start with a space/i)).toBeTruthy()

    fill(/phone_number/i, 'call me')
    expect(screen.getByText(/can only contain digits/i)).toBeTruthy()

    fill(/phone_number/i, '555.000.0000')
    expect(screen.getByText(/can only contain digits/i)).toBeTruthy()

    // Formatted numbers are fine — punctuation does not count toward the length.
    fill(/phone_number/i, '+1 (555) 000-0000')
    expect(screen.queryByText(/can only contain digits/i)).toBeNull()
    expect(screen.queryByText(/10–15 digits/)).toBeNull()

    fill(/phone_number/i, '5550000000')
    expect(screen.queryByText(/can only contain digits/i)).toBeNull()

    // The field is optional, so clearing it is not an error.
    fill(/phone_number/i, '')
    expect(screen.queryByText(/can only contain digits/i)).toBeNull()
    expect(screen.queryByText(/phone number cannot/i)).toBeNull()
  })

  it('requires an @ in the email and refuses a leading space', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    fill(/email_address/i, ' a@ourworldenergy.com')
    expect(screen.getByText(/email cannot start with a space/i)).toBeTruthy()

    fill(/email_address/i, 'ourworldenergy.com')
    expect(screen.getByText(/must contain an @/i)).toBeTruthy()

    fill(/email_address/i, 'elias@')
    expect(screen.getByText(/valid email address/i)).toBeTruthy()

    fill(/email_address/i, 'elias.thorne@ourworldenergy.com')
    expect(screen.queryByText(/email cannot|must contain an @|valid email/i)).toBeNull()
  })

  it('keeps Create disabled until every field is valid, then sends trimmed values', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    fill(/full_name/i, 'Elias 2')
    fill(/email_address/i, 'elias.thorne@ourworldenergy.com')
    chooseRole('org_admin')
    // Name is still invalid, so the action stays blocked.
    expect(createButton().disabled).toBe(true)

    fill(/full_name/i, 'Elias Thorne')
    // Too short to be a real number — still blocked.
    fill(/phone_number/i, '55500')
    expect(screen.getByText(/10–15 digits/)).toBeTruthy()
    expect(createButton().disabled).toBe(true)

    fill(/phone_number/i, '5550000000')
    expect(createButton().disabled).toBe(false)

    fireEvent.click(createButton())
    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    expect(mockCreateUser.mock.calls[0][0]).toEqual({
      email: 'elias.thorne@ourworldenergy.com',
      full_name: 'Elias Thorne',
      phone_number: '5550000000',
      role: 'org_admin',
    })
  })

  it('bounds the phone number to 10–15 digits', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    fill(/phone_number/i, '555000000') // 9
    expect(screen.getByText(/10–15 digits/)).toBeTruthy()

    fill(/phone_number/i, '1234567890123456') // 16
    expect(screen.getByText(/10–15 digits/)).toBeTruthy()

    // Counted in digits, so formatting neither helps nor hurts.
    fill(/phone_number/i, '(555) 000-000') // 9 digits, 13 characters
    expect(screen.getByText(/10–15 digits/)).toBeTruthy()

    fill(/phone_number/i, '123456789012345') // 15, the upper bound
    expect(screen.queryByText(/10–15 digits/)).toBeNull()

    fill(/phone_number/i, '5550000000') // 10, the lower bound
    expect(screen.queryByText(/10–15 digits/)).toBeNull()
  })

  it('does not flag the fields it just submitted while the create is in flight', async () => {
    // Regression: the dialog used to blank itself the moment Create was clicked,
    // so the (still open) form showed "Enter the user's full name." against a user
    // that was being created perfectly well.
    let settle: (value: never) => void = () => {}
    mockCreateUser.mockReturnValue(new Promise((resolve) => (settle = resolve as never)))

    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fill(/full_name/i, 'Elias Thorne')
    fill(/email_address/i, 'elias.thorne@ourworldenergy.com')
    chooseRole('org_admin')
    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    // Still open, still filled in, and nothing is complaining.
    expect((screen.getByLabelText(/full_name/i) as HTMLInputElement).value).toBe('Elias Thorne')
    expect(screen.queryByText(/enter the user’s full name/i)).toBeNull()
    expect(screen.queryByText(/enter an email address/i)).toBeNull()
    settle(undefined as never)
  })

  it('keeps what was typed when the create is rejected', async () => {
    // A duplicate email is a 409, and the admin needs their input back to fix it.
    mockCreateUser.mockRejectedValue(new Error('A user with this email already exists'))

    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fill(/full_name/i, 'Elias Thorne')
    fill(/email_address/i, 'taken@ourworldenergy.com')
    chooseRole('org_admin')
    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect((screen.getByLabelText(/full_name/i) as HTMLInputElement).value).toBe('Elias Thorne'),
    )
    expect((screen.getByLabelText(/email_address/i) as HTMLInputElement).value).toBe(
      'taken@ourworldenergy.com',
    )
    // Still submittable, so the email can be corrected and retried.
    expect(createButton().disabled).toBe(false)
  })

  it('starts blank again the next time it is opened', async () => {
    mockCreateUser.mockResolvedValue({
      user: user({ id: 99, full_name: 'Elias Thorne' }),
      email_sent: false,
      message: 'user created',
      reactivated: false,
    })
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fill(/full_name/i, 'Elias Thorne')
    fill(/email_address/i, 'elias.thorne@ourworldenergy.com')
    chooseRole('org_admin')
    fireEvent.click(createButton())

    // The dialog closes on success…
    await waitFor(() => expect(screen.queryByLabelText(/full_name/i)).toBeNull())

    // …and reopening gives a clean form with no leftover errors from last time.
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    expect((screen.getByLabelText(/full_name/i) as HTMLInputElement).value).toBe('')
    expect(document.getElementById('user-name-error')).toBeNull()
    expect(document.getElementById('user-email-error')).toBeNull()
    expect(createButton().disabled).toBe(true)
  })

  /** Fill every control the form offers, including the role-scoped ones. */
  function fillEverything() {
    fill(/full_name/i, 'Elias Thorne')
    fill(/email_address/i, 'elias.thorne@ourworldenergy.com')
    fill(/phone_number/i, '5550000000')
    chooseRole('standard_user')
    fireEvent.change(screen.getByRole('combobox', { name: /^department$/i }), {
      target: { value: 'Sales' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sub_departments/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Partner Success' }))
    fireEvent.change(screen.getByLabelText(/description_justification/i), {
      target: { value: 'needs access' },
    })
  }

  /** Every control is back to its blank state. */
  function expectBlankForm() {
    expect((screen.getByLabelText(/full_name/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/email_address/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/phone_number/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/description_justification/i) as HTMLTextAreaElement).value).toBe(
      '',
    )
    expect((screen.getByRole('combobox', { name: /^role$/i }) as HTMLSelectElement).value).toBe('')
    // A blank role hides the scope controls entirely.
    expect(screen.queryByRole('combobox', { name: /^department$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /sub_departments/i })).toBeNull()
    // And no leftover validation from the previous visit.
    expect(document.getElementById('user-name-error')).toBeNull()
    expect(document.getElementById('user-email-error')).toBeNull()
    expect(createButton().disabled).toBe(true)
  }

  it('starts blank after being dismissed with Escape', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fillEverything()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByLabelText(/full_name/i)).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    expectBlankForm()
  })

  it('starts blank after being closed with the X', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fillEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByLabelText(/full_name/i)).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    expectBlankForm()
  })

  it('starts blank after a rejected create is dismissed', async () => {
    mockCreateUser.mockRejectedValue(new Error('A user with this email already exists'))
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fillEverything()
    fireEvent.click(createButton())
    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))

    // Kept while the dialog is open, so the email can be corrected…
    expect((screen.getByLabelText(/full_name/i) as HTMLInputElement).value).toBe('Elias Thorne')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByLabelText(/full_name/i)).toBeNull())

    // …but abandoned once it is dismissed.
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    expectBlankForm()
  })

  it('starts blank after a successful create, scope controls included', async () => {
    mockCreateUser.mockResolvedValue({
      user: user({ id: 99, full_name: 'Elias Thorne' }),
      email_sent: false,
      message: 'user created',
      reactivated: false,
    })
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    fillEverything()
    fireEvent.click(createButton())

    await waitFor(() => expect(screen.queryByLabelText(/full_name/i)).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    expectBlankForm()
  })

  it('marks an invalid control for assistive tech', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    const email = fill(/email_address/i, 'nope')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe('user-email-error')
  })
})

describe('User Management — edit-user field validation', () => {
  /** Open the edit dialog on a row and return a setter for its phone field. */
  async function openEdit(name: string) {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: `Edit ${name}` }))
    return (value: string) => {
      const input = screen.getByLabelText(/phone number/i)
      fireEvent.change(input, { target: { value } })
      fireEvent.blur(input)
      return input
    }
  }

  const saveButton = () =>
    screen.getByRole('button', { name: /Save Changes/i }) as HTMLButtonElement

  it('applies the same phone rules as the add dialog', async () => {
    const setPhone = await openEdit('Priya Raman')

    setPhone('555000000') // 9
    expect(screen.getByText(/10–15 digits/)).toBeTruthy()
    expect(saveButton().disabled).toBe(true)

    setPhone('call me')
    expect(screen.getByText(/can only contain digits/i)).toBeTruthy()
    expect(saveButton().disabled).toBe(true)

    // A stored number in the API's own documented format is accepted as-is, so
    // editing an existing user does not force their phone to be retyped.
    setPhone('+1 (555) 000-0000')
    expect(document.getElementById('user-phone-error')).toBeNull()
    expect(saveButton().disabled).toBe(false)

    setPhone('919876543210') // 12
    expect(screen.queryByText(/10–15 digits/)).toBeNull()
    expect(saveButton().disabled).toBe(false)
  })

  it('flags a stored invalid phone number under the phone field, not at the foot of the form', async () => {
    // The value was not typed just now, so waiting for a blur that may never come
    // would leave the only explanation in the grey summary line at the bottom.
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: 'Edit User 4' }))

    const messages = screen.getAllByText(/10–15 digits/)
    expect(messages).toHaveLength(1) // Not repeated in the footer summary.
    expect(messages[0].id).toBe('user-phone-error')
    expect(messages[0].className).toMatch(/text-critical/)
    expect(screen.getByLabelText(/phone number/i).getAttribute('aria-describedby')).toBe(
      'user-phone-error',
    )
    expect(saveButton().disabled).toBe(true)
  })

  it('applies the name rules on edit too', async () => {
    await openEdit('Priya Raman')

    const name = screen.getByLabelText(/full name/i)
    fireEvent.change(name, { target: { value: 'Priya 2' } })
    fireEvent.blur(name)
    expect(screen.getByText(/cannot contain numbers/i)).toBeTruthy()
    expect(saveButton().disabled).toBe(true)

    fireEvent.change(name, { target: { value: 'Priya Raman' } })
    expect(saveButton().disabled).toBe(false)
  })

  it('locks the email, because changing it would strand the password mail', async () => {
    // create-user is what issues the initial password and mails it; update-user
    // sends nothing. A changed address therefore never receives credentials.
    await openEdit('Priya Raman')

    const email = screen.getByLabelText(/email address/i) as HTMLInputElement
    expect(email.readOnly).toBe(true)
    expect(email.value).toBe('priya.raman@ourworldenergy.com')
    expect(screen.getByText(/fixed after the account is created/i)).toBeTruthy()

    // Still submitted, since update-user is a full replace and requires it.
    fireEvent.click(saveButton())
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1))
    expect(mockUpdateUser.mock.calls[0][0].email).toBe('priya.raman@ourworldenergy.com')
  })

  it('never lets a stored address it cannot parse block Save', async () => {
    // The address comes from the server and there is no field to correct it in, so
    // a format complaint here would be a dead end rather than a prompt.
    mockGetUsers.mockImplementation(async () => ({
      total: 1,
      page: 1,
      page_size: PAGE_SIZE,
      // org_admin, so no scope requirement can be what blocks Save — the odd
      // address is the only thing under test here.
      users: [
        user({
          id: 77,
          full_name: 'Legacy Account',
          email: 'legacy@localhost',
          role: METADATA.roles[0],
        }),
      ],
    }))
    renderPage()
    await waitFor(() => expect(screen.getByText('Legacy Account')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Edit Legacy Account' }))
    expect(document.getElementById('user-email-error')).toBeNull()
    expect(saveButton().disabled).toBe(false)
  })

  it('leaves the email editable when adding a user', async () => {
    renderPage()
    await waitForRegistry()
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))

    const email = screen.getByLabelText(/email_address/i) as HTMLInputElement
    expect(email.readOnly).toBe(false)
    expect(screen.queryByText(/fixed after the account is created/i)).toBeNull()
  })

  it('does not flag a stored phone number that already passes', async () => {
    // Priya's record carries no phone at all, and the field is optional — opening
    // the dialog must not greet the admin with an error they did not cause.
    await openEdit('Priya Raman')
    expect(document.getElementById('user-phone-error')).toBeNull()
    expect(saveButton().disabled).toBe(false)
  })
})

describe('User Management — update and delete', () => {
  it('rebuilds scope when an edit changes the role', async () => {
    renderPage()
    await waitForRegistry()

    // Priya is department-scoped; move her to a platform role.
    fireEvent.click(screen.getByRole('button', { name: 'Edit Priya Raman' }))
    expect((screen.getByRole('combobox', { name: /^role$/i }) as HTMLSelectElement).value).toBe(
      'management_user',
    )

    chooseRole('platform_admin')
    fireEvent.click(screen.getByRole('button', { name: /platform access/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo' }))
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1))
    const payload = mockUpdateUser.mock.calls[0][0]
    // A full replace carrying only the new role's scope — no leftover department.
    expect(payload).toEqual({
      user_id: 3,
      email: 'priya.raman@ourworldenergy.com',
      full_name: 'Priya Raman',
      role: 'platform_admin',
      platforms: ['solo'],
    })
  })

  it('warns that a re-roled user keeps the old role until they sign in again', async () => {
    // The role lives in the JWT, which is only reissued at login — so their open
    // session is unaffected by this change, and the admin should know that.
    mockUpdateUser.mockResolvedValue(
      user({
        id: 2,
        full_name: 'Alice Schmidt',
        email: 'alice.schmidt@ourworldenergy.com',
        role: METADATA.roles[0], // promoted platform_admin → org_admin
      }),
    )
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Alice Schmidt' }))
    chooseRole('org_admin')
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockNotify.info).toHaveBeenCalledTimes(1))
    expect(mockNotify.info.mock.calls[0][0]).toMatch(/sign out and back in/i)
  })

  it('says nothing about sessions when the role did not change', async () => {
    mockUpdateUser.mockResolvedValue(
      user({ id: 2, full_name: 'Alice Renamed', role: METADATA.roles[1] }),
    )
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Alice Schmidt' }))
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1))
    expect(mockNotify.info).not.toHaveBeenCalled()
  })

  it('signs the admin out when they change their own role', async () => {
    // Their own token now misdescribes their access, so every later call would be
    // judged against a role the UI no longer agrees with. Start a fresh session.
    mockUpdateUser.mockResolvedValue(
      user({
        id: 1,
        full_name: 'Bootstrap Admin',
        email: ADMIN_EMAIL,
        role: METADATA.roles[3], // demoted to executive_user
      }),
    )
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Bootstrap Admin' }))
    chooseRole('executive_user')
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy())
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('requires typing DELETE, then soft-deletes by user_id', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alice Schmidt' }))
    const confirm = screen.getByRole('button', { name: /^Delete$/i }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    // A near-miss must not arm the action.
    fireEvent.change(screen.getByLabelText(/confirm de-provisioning/i), {
      target: { value: 'DELET' },
    })
    expect(confirm.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/confirm de-provisioning/i), {
      target: { value: 'DELETE' },
    })
    expect(confirm.disabled).toBe(false)

    fireEvent.click(confirm)
    await waitFor(() => expect(mockDeleteUser).toHaveBeenCalledTimes(1))
    // Soft delete takes the numeric user_id straight from the row.
    expect(mockDeleteUser.mock.calls[0][0]).toBe(2)
  })

  it('confirms on Enter once DELETE has been typed', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alice Schmidt' }))
    const field = screen.getByLabelText(/confirm de-provisioning/i)
    // The caret is already in the box, so it is type-then-return.
    expect(document.activeElement).toBe(field)

    // Enter before the word is complete must not delete anything.
    fireEvent.change(field, { target: { value: 'DELET' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(mockDeleteUser).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: 'DELETE' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(mockDeleteUser).toHaveBeenCalledTimes(1))
    expect(mockDeleteUser.mock.calls[0][0]).toBe(2)
  })

  it('ignores other keys in the confirmation box', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alice Schmidt' }))
    const field = screen.getByLabelText(/confirm de-provisioning/i)
    fireEvent.change(field, { target: { value: 'DELETE' } })

    fireEvent.keyDown(field, { key: 'a' })
    fireEvent.keyDown(field, { key: ' ' })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('offers no delete control on the signed-in admin’s own row', async () => {
    renderPage()
    await waitForRegistry()

    // The backend refuses a self-delete with a 400, so the button is not offered.
    expect(screen.queryByRole('button', { name: 'Delete Bootstrap Admin' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit Bootstrap Admin' })).toBeTruthy()

    const ownRow = screen.getByText('Bootstrap Admin').closest('tr')!
    expect(within(ownRow).getByText('(you)')).toBeTruthy()
    // Other rows keep theirs.
    expect(screen.getByRole('button', { name: 'Delete Alice Schmidt' })).toBeTruthy()
  })

  it('refetches the registry and the role counts after a mutation', async () => {
    mockCreateUser.mockResolvedValue({
      user: user({ id: 99, full_name: 'Nadia Rahman' }),
      email_sent: false,
      message: 'user created',
      reactivated: false,
    })
    renderPage()
    await openAddUser()
    chooseRole('org_admin')

    const usersCallsBefore = mockGetUsers.mock.calls.length
    fireEvent.click(createButton())

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1))
    // Role Allocation reads user_count from get-metadata, so both are invalidated.
    await waitFor(() => expect(mockGetMetadata.mock.calls.length).toBeGreaterThan(1))
    expect(mockGetUsers.mock.calls.length).toBeGreaterThan(usersCallsBefore)
  })
})

describe('User Management — access and metadata', () => {
  it('gates on the backend’s answer, not on the token’s role claim', async () => {
    // The token still says org_admin — this is exactly the state a demoted admin's
    // open session is in, because the role claim is fixed for the token's 8 hours.
    mockGetMetadata.mockRejectedValue(new ApiError('http', 'forbidden', 403))
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/Organizational Admin access required/i)).toBeTruthy(),
    )
    // And it says what actually fixes it, since a reload cannot.
    expect(screen.getByText(/sign out and back in/i)).toBeTruthy()
    // The registry itself is never requested once access is refused.
    expect(mockGetUsers).not.toHaveBeenCalled()
  })

  it('shows the registry when the backend allows it, whatever the claim says', async () => {
    // The mirror case: a promoted user whose token still says platform_admin. If the
    // backend authorises from the database, the page must not hide behind the claim.
    useAuthStore.setState({
      token: 'token',
      user: {
        email: 'alice.schmidt@ourworldenergy.com',
        role: 'platform_admin',
        roleLabel: 'Platform Admin',
      },
      expiresAt: null,
      mustChangePassword: false,
    })
    renderPage()

    await waitForRegistry()
    expect(screen.queryByText(/Organizational Admin access required/i)).toBeNull()
  })

  it('does not mistake a server error for a refusal', async () => {
    // A 500 is transient; hiding the whole page behind it would be wrong.
    mockGetMetadata.mockRejectedValue(new ApiError('http', 'failed to fetch metadata', 500))
    renderPage()

    await waitFor(() => expect(screen.getByText('User Registry')).toBeTruthy())
    expect(screen.queryByText(/Organizational Admin access required/i)).toBeNull()
    expect(mockGetUsers).toHaveBeenCalled()
  })

  it('surfaces a metadata failure instead of showing empty dropdowns', async () => {
    mockGetMetadata.mockRejectedValue(new Error('failed to fetch metadata'))
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/failed to fetch metadata/i),
    )
  })

  it('drives the role allocation card and access matrix from metadata', async () => {
    renderPage()
    await waitForRegistry()

    // user_count per role, zero-padded as the design does for single digits.
    const allocation = screen.getByText('Role Allocation').closest('section')!
    expect(within(allocation).getByText('02')).toBeTruthy()
    expect(within(allocation).getByText('09')).toBeTruthy()

    const matrix = within(screen.getByRole('table', { name: 'Role Access Matrix' }))
    expect(matrix.getAllByRole('row').slice(1)).toHaveLength(METADATA.roles.length)
    // Rotation rights are derived from the two booleans the API sends.
    const orgAdminRow = matrix.getByText('Organizational Admin').closest('tr')!
    expect(within(orgAdminRow).getByText('Rotate / update')).toBeTruthy()
    const standardRow = matrix.getByText('Standard User').closest('tr')!
    expect(within(standardRow).getByText('No rotation rights')).toBeTruthy()
    const executiveRow = matrix.getByText('Executive User').closest('tr')!
    expect(within(executiveRow).getByText('Request only')).toBeTruthy()
  })
})

describe('User Management — active users chart', () => {
  it('switches the active-users range, and only then offers the date pickers', async () => {
    renderPage()
    await waitForRegistry()

    const pill = (name: string) => screen.getByRole('button', { name })
    // Defaults to the trailing week.
    expect(pill('Last 7 days')).toHaveProperty('ariaPressed', 'true')
    expect(screen.queryByLabelText('from')).toBeNull()

    fireEvent.click(pill('Today'))
    expect(pill('Today')).toHaveProperty('ariaPressed', 'true')
    expect(pill('Last 7 days')).toHaveProperty('ariaPressed', 'false')
    // Presets become concrete inclusive dates before anything is requested — the
    // backend takes dates, never "today".
    await waitFor(() => {
      const [range] = mockGetActiveUserStats.mock.calls.at(-1)!
      expect(range.start_date).toBe(range.end_date)
    })

    fireEvent.click(pill('Custom range'))
    const from = screen.getByLabelText('from') as HTMLInputElement
    const to = screen.getByLabelText('to') as HTMLInputElement
    expect(from.value).toBeTruthy()

    // Moving the start past the end drags the end with it rather than inverting.
    fireEvent.change(from, { target: { value: to.value } })
    expect(from.value).toBe(to.value)

    // The panel floats, so dismissing it leaves the custom range selected.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('from')).toBeNull()
    expect(pill('Custom range')).toHaveProperty('ariaPressed', 'true')
  })

  it('reads out the hovered bucket on the active-users chart', async () => {
    renderPage()
    await waitForRegistry()

    // The plot only exists once the range's counts have arrived.
    const chart = await screen.findByRole('img', { name: /Active users/i })
    const plot = chart.parentElement!
    // jsdom has no layout, so the cursor maths needs a box to measure against.
    plot.getBoundingClientRect = () => ({ left: 0, width: 600, top: 0, height: 208 }) as DOMRect

    // Queried within the plot, since the axis captions repeat the same labels.
    const readout = within(plot)
    // The same buckets the mocked API answered the default range with.
    const week = activeUsersSeries(activeStats(mockGetActiveUserStats.mock.calls[0][0])).points

    // Far right of a 7-day window is today; far left is six days back.
    fireEvent.mouseMove(plot, { clientX: 600 })
    expect(readout.getByText(week.at(-1)!.label)).toBeTruthy()
    expect(readout.getByText(week.at(-1)!.value.toLocaleString())).toBeTruthy()

    fireEvent.mouseMove(plot, { clientX: 0 })
    expect(readout.getByText(week[0].label)).toBeTruthy()

    // Leaving the plot clears the readout.
    fireEvent.mouseLeave(plot)
    expect(readout.queryByText(week[0].value.toLocaleString())).toBeNull()
  })
})
