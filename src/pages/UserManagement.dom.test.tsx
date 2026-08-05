// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManagement } from './UserManagement'
import {
  createUser,
  deleteUser,
  getMetadata,
  getUsers,
  updateUser,
} from '@/lib/api/user-management'
import type {
  GetUsersData,
  MetadataData,
  Role,
  UserRecord,
} from '@/lib/api/user-management.types'
import { activeUsersSeries } from '@/lib/active-users-data'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/user-management', () => ({
  getMetadata: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))
// Toasts are asserted in the hooks' own right; here they would just be noise.
vi.mock('@/lib/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockGetMetadata = vi.mocked(getMetadata)
const mockGetUsers = vi.mocked(getUsers)
const mockCreateUser = vi.mocked(createUser)
const mockUpdateUser = vi.mocked(updateUser)
const mockDeleteUser = vi.mocked(deleteUser)

const PAGE_SIZE = 5
const ADMIN_EMAIL = 'bootstrap.admin@ourworldenergy.com'

function role(
  key: Role['key'],
  name: string,
  rank: number,
  extra: Partial<Role> = {},
): Role {
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
  ...Array.from({ length: 11 }, (_, i) => user({ id: i + 4 })),
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
      <UserManagement />
    </QueryClientProvider>,
  )
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
})
afterEach(cleanup)

function registryRows() {
  // Named, because the page also renders the role access matrix table.
  return within(screen.getByRole('table', { name: 'User Registry' }))
    .getAllByRole('row')
    .slice(1)
}

/** Wait for the first get-users response to paint. */
async function waitForRegistry() {
  await waitFor(() => expect(registryRows().length).toBe(PAGE_SIZE))
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
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalledWith({ page: 2, page_size: PAGE_SIZE }))

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
    expect(
      screen.getAllByRole('checkbox').map((c) => c.parentElement?.textContent),
    ).toEqual(['Business Development', 'Partner Success', 'Sales Operations'])

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
  it('shows a gate and calls nothing when the user is not an org admin', async () => {
    useAuthStore.setState({
      token: 'token',
      user: {
        email: 'priya.raman@ourworldenergy.com',
        role: 'management_user',
        roleLabel: 'Management User',
      },
      expiresAt: null,
      mustChangePassword: false,
    })
    renderPage()

    expect(screen.getByText(/Organizational Admin access required/i)).toBeTruthy()
    expect(screen.getByText(/signed in as Management User/i)).toBeTruthy()
    // Both registry routes are org_admin only; calling them would only earn a 403.
    expect(mockGetUsers).not.toHaveBeenCalled()
    expect(mockGetMetadata).not.toHaveBeenCalled()
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
    // Hourly buckets, so the axis starts at midnight.
    expect(screen.getByText('00:00')).toBeTruthy()

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

    const plot = screen.getByRole('img', { name: /Active users/i }).parentElement!
    // jsdom has no layout, so the cursor maths needs a box to measure against.
    plot.getBoundingClientRect = () => ({ left: 0, width: 600, top: 0, height: 208 }) as DOMRect

    // Queried within the plot, since the axis captions repeat the same labels.
    const readout = within(plot)
    const week = activeUsersSeries('last_7_days', new Date()).points

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
