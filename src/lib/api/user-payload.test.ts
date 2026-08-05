import { describe, expect, it } from 'vitest'
import {
  buildCreateUserPayload,
  buildUpdateUserPayload,
  describeUserFormGap,
  formValuesFromUser,
  type UserFormValues,
} from './user-payload'
import type { Role, UserRecord } from './user-management.types'

/**
 * A form where every scope control has been filled in, whatever the role. The
 * point of most tests below is that the builder drops the fields the role does
 * not use — a "clean" form would not prove that.
 */
function dirtyForm(overrides: Partial<UserFormValues> = {}): UserFormValues {
  return {
    email: 'new.user@ourworldenergy.com',
    fullName: 'New User',
    phoneNumber: '+1 (555) 000-0000',
    description: 'reason for access',
    role: 'standard_user',
    department: 'Internal Operations',
    subDepartments: ['CAD', 'Procurement'],
    platforms: ['aurora', 'solo'],
    ...overrides,
  }
}

describe('buildCreateUserPayload — global roles', () => {
  // The backend answers 400 "department and platforms must be empty for this role"
  // if any scope field is present, so absent has to mean absent.
  it.each(['org_admin', 'dev_admin', 'executive_user'] as const)(
    'omits every scope field for %s',
    (role) => {
      const payload = buildCreateUserPayload(dirtyForm({ role }))

      expect(payload).toEqual({
        email: 'new.user@ourworldenergy.com',
        full_name: 'New User',
        phone_number: '+1 (555) 000-0000',
        description: 'reason for access',
        role,
      })
      expect('department' in payload).toBe(false)
      expect('sub_departments' in payload).toBe(false)
      expect('platforms' in payload).toBe(false)
    },
  )
})

describe('buildCreateUserPayload — platform_admin', () => {
  it('sends platforms and omits the department fields', () => {
    const payload = buildCreateUserPayload(dirtyForm({ role: 'platform_admin' }))

    expect(payload.platforms).toEqual(['aurora', 'solo'])
    expect('department' in payload).toBe(false)
    expect('sub_departments' in payload).toBe(false)
  })

  it('still sends platforms when empty, so the backend can explain why', () => {
    const payload = buildCreateUserPayload(dirtyForm({ role: 'platform_admin', platforms: [] }))
    expect(payload.platforms).toEqual([])
  })

  it('de-duplicates keys and drops blanks', () => {
    const payload = buildCreateUserPayload(
      dirtyForm({ role: 'platform_admin', platforms: ['aurora', ' aurora ', '', 'tape'] }),
    )
    expect(payload.platforms).toEqual(['aurora', 'tape'])
  })
})

describe('buildCreateUserPayload — department roles', () => {
  it.each(['management_user', 'standard_user'] as const)(
    'sends department and sub_departments for %s, omitting platforms',
    (role) => {
      const payload = buildCreateUserPayload(dirtyForm({ role }))

      expect(payload.department).toBe('Internal Operations')
      expect(payload.sub_departments).toEqual(['CAD', 'Procurement'])
      expect('platforms' in payload).toBe(false)
    },
  )

  it('omits sub_departments entirely when none are chosen', () => {
    // Omitted means "the whole department" — sending [] would say the same thing,
    // but an absent key keeps the payload honest about what the admin picked.
    const payload = buildCreateUserPayload(dirtyForm({ subDepartments: [] }))
    expect('sub_departments' in payload).toBe(false)
    expect(payload.department).toBe('Internal Operations')
  })

  it('preserves department case exactly, since the backend matches on it', () => {
    const payload = buildCreateUserPayload(dirtyForm({ department: 'Finance-Legal' }))
    expect(payload.department).toBe('Finance-Legal')
  })
})

describe('buildCreateUserPayload — identity fields', () => {
  it('trims email and full_name', () => {
    const payload = buildCreateUserPayload(
      dirtyForm({ email: '  x@ourworldenergy.com ', fullName: '  X Y  ' }),
    )
    expect(payload.email).toBe('x@ourworldenergy.com')
    expect(payload.full_name).toBe('X Y')
  })

  it('omits blank optional fields rather than sending empty strings', () => {
    const payload = buildCreateUserPayload(
      dirtyForm({ role: 'org_admin', phoneNumber: '   ', description: '' }),
    )
    expect('phone_number' in payload).toBe(false)
    expect('description' in payload).toBe(false)
  })

  it('never invents a password field', () => {
    // The backend generates the initial password itself.
    expect('password' in buildCreateUserPayload(dirtyForm())).toBe(false)
  })

  it('refuses to build a payload with no role', () => {
    expect(() => buildCreateUserPayload(dirtyForm({ role: '' }))).toThrow(/select a role/i)
  })
})

describe('buildUpdateUserPayload', () => {
  it('adds user_id and keeps the same scope rules', () => {
    const payload = buildUpdateUserPayload(10, dirtyForm({ role: 'management_user' }))

    expect(payload.user_id).toBe(10)
    expect(payload.department).toBe('Internal Operations')
    expect('platforms' in payload).toBe(false)
  })

  it('rebuilds scope for the new role instead of carrying the old one over', () => {
    // The registry row was department-scoped; the admin switched it to a platform
    // role without clearing the department control. The old scope must not ship.
    const payload = buildUpdateUserPayload(
      10,
      dirtyForm({ role: 'platform_admin', department: 'Technology', subDepartments: ['Technology'] }),
    )

    expect(payload.platforms).toEqual(['aurora', 'solo'])
    expect('department' in payload).toBe(false)
    expect('sub_departments' in payload).toBe(false)
  })

  it('drops platforms when a platform role becomes a global one', () => {
    const payload = buildUpdateUserPayload(10, dirtyForm({ role: 'executive_user' }))
    expect('platforms' in payload).toBe(false)
    expect('department' in payload).toBe(false)
  })
})

describe('describeUserFormGap', () => {
  it('accepts a complete form for every role shape', () => {
    expect(describeUserFormGap(dirtyForm({ role: 'org_admin' }))).toBeNull()
    expect(describeUserFormGap(dirtyForm({ role: 'platform_admin' }))).toBeNull()
    expect(describeUserFormGap(dirtyForm({ role: 'standard_user' }))).toBeNull()
  })

  it('requires name, email and role', () => {
    expect(describeUserFormGap(dirtyForm({ fullName: ' ' }))).toMatch(/full name/i)
    expect(describeUserFormGap(dirtyForm({ email: '' }))).toMatch(/email/i)
    expect(describeUserFormGap(dirtyForm({ role: '' }))).toMatch(/role/i)
  })

  it('requires a department only for the department roles', () => {
    expect(describeUserFormGap(dirtyForm({ role: 'standard_user', department: '' }))).toMatch(
      /department/i,
    )
    expect(describeUserFormGap(dirtyForm({ role: 'org_admin', department: '' }))).toBeNull()
  })

  it('requires at least one platform only for platform_admin', () => {
    expect(describeUserFormGap(dirtyForm({ role: 'platform_admin', platforms: [] }))).toMatch(
      /platform/i,
    )
    expect(describeUserFormGap(dirtyForm({ role: 'standard_user', platforms: [] }))).toBeNull()
  })
})

/** Minimal Role, since only `key` drives the scope decisions. */
function role(key: Role['key']): Role {
  return {
    id: 1,
    key,
    name: key,
    description: '',
    scope_type: 'all',
    can_rotate_credentials: false,
    can_request_rotation: false,
    rank: 0,
  }
}

function record(overrides: Partial<UserRecord>): UserRecord {
  return {
    id: 9,
    email: 'user@ourworldenergy.com',
    full_name: 'User',
    role: role('standard_user'),
    status: 'active',
    must_change_password: false,
    created_at: '2026-08-05T09:43:22.163663Z',
    updated_at: '2026-08-05T09:43:22.163663Z',
    ...overrides,
  }
}

describe('formValuesFromUser', () => {
  it('maps a department-scoped row to its two scope controls', () => {
    const form = formValuesFromUser(
      record({
        role: role('management_user'),
        department: { id: 5, name: 'Internal Operations' },
        sub_departments: [{ id: 12, department_id: 5, name: 'CAD' }],
      }),
    )

    expect(form.department).toBe('Internal Operations')
    expect(form.subDepartments).toEqual(['CAD'])
    expect(form.platforms).toEqual([])
  })

  it('maps a platform row to platform keys and no department', () => {
    const form = formValuesFromUser(
      record({ role: role('platform_admin'), platforms: ['aurora', 'docusign'] }),
    )

    expect(form.platforms).toEqual(['aurora', 'docusign'])
    expect(form.department).toBe('')
  })

  it('ignores scope the row’s role does not use', () => {
    // A response that carried both (or a stale local row) must not seed the form
    // with scope the role forbids — it would round-trip straight into a 400.
    const form = formValuesFromUser(
      record({
        role: role('org_admin'),
        department: { id: 5, name: 'Internal Operations' },
        platforms: ['aurora'],
      }),
    )

    expect(form.department).toBe('')
    expect(form.platforms).toEqual([])
    expect(form.subDepartments).toEqual([])
  })

  it('round-trips a row through the builder without leaking scope', () => {
    const user = record({
      role: role('platform_admin'),
      platforms: ['aurora'],
      phone_number: '+1 (555) 000-0000',
    })
    const payload = buildUpdateUserPayload(user.id, formValuesFromUser(user))

    expect(payload).toEqual({
      user_id: 9,
      email: 'user@ourworldenergy.com',
      full_name: 'User',
      phone_number: '+1 (555) 000-0000',
      role: 'platform_admin',
      platforms: ['aurora'],
    })
  })
})
