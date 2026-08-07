import { describe, expect, it } from 'vitest'
import {
  buildCreateUserPayload,
  buildUpdateUserPayload,
  describeUserFormGap,
  formValuesFromUser,
  validateEmail,
  validateFullName,
  validatePhoneNumber,
  validateUserForm,
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
    // Digits only — the form now refuses "+1 (555) 000-0000", even though that is
    // the shape the handbook's own examples use. See validatePhoneNumber.
    phoneNumber: '5550000000',
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
        phone_number: '5550000000',
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
    expect(describeUserFormGap(dirtyForm({ fullName: '' }))).toMatch(/full name/i)
    expect(describeUserFormGap(dirtyForm({ email: '' }))).toMatch(/email/i)
    expect(describeUserFormGap(dirtyForm({ role: '' }))).toMatch(/role/i)
    // A space-only name trips the leading-space rule before the empty-name one.
    expect(describeUserFormGap(dirtyForm({ fullName: ' ' }))).toMatch(/start with a space/i)
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

describe('validateFullName', () => {
  it('rejects a leading space', () => {
    expect(validateFullName(' Elias Thorne')).toMatch(/cannot start with a space/i)
  })

  it('rejects digits anywhere in the name', () => {
    expect(validateFullName('Elias2')).toMatch(/cannot contain numbers/i)
    expect(validateFullName('3lias Thorne')).toMatch(/cannot contain numbers/i)
  })

  it('rejects special characters', () => {
    expect(validateFullName('Elias@Thorne')).toMatch(/special characters/i)
    expect(validateFullName('Elias_Thorne')).toMatch(/special characters/i)
    expect(validateFullName('<script>')).toMatch(/special characters/i)
  })

  it('requires something other than whitespace', () => {
    expect(validateFullName('')).toMatch(/full name/i)
  })

  it('accepts ordinary names, including the two real ones use', () => {
    // Hyphen and apostrophe are deliberately allowed — rejecting them would refuse
    // legitimate names, and the registry already contains a "Doe-Reid".
    expect(validateFullName('Elias Thorne')).toBeNull()
    expect(validateFullName('Jonathan Doe-Reid')).toBeNull()
    expect(validateFullName("Siobhan O'Brien")).toBeNull()
    // Non-Latin letters are letters, not special characters.
    expect(validateFullName('José Müller')).toBeNull()
    // A trailing space is fine; it gets trimmed before it is sent.
    expect(validateFullName('Elias Thorne ')).toBeNull()
  })
})

describe('validatePhoneNumber', () => {
  it('rejects a leading space', () => {
    expect(validatePhoneNumber(' 5550000000')).toMatch(/cannot start with a space/i)
  })

  it('rejects letters and punctuation', () => {
    expect(validatePhoneNumber('555-000-0000')).toMatch(/digits only/i)
    expect(validatePhoneNumber('+1 (555) 000-0000')).toMatch(/digits only/i)
    expect(validatePhoneNumber('call me')).toMatch(/digits only/i)
    expect(validatePhoneNumber('555 000')).toMatch(/digits only/i)
  })

  it('accepts digits, and treats absent as fine because the field is optional', () => {
    expect(validatePhoneNumber('5550000000')).toBeNull()
    expect(validatePhoneNumber('')).toBeNull()
    expect(validatePhoneNumber(undefined)).toBeNull()
  })
})

describe('validateEmail', () => {
  it('rejects a leading space', () => {
    expect(validateEmail(' a@ourworldenergy.com')).toMatch(/cannot start with a space/i)
  })

  it('requires an @', () => {
    expect(validateEmail('ourworldenergy.com')).toMatch(/must contain an @/i)
  })

  it('rejects an @ with nothing usable around it', () => {
    expect(validateEmail('@ourworldenergy.com')).toMatch(/valid email/i)
    expect(validateEmail('elias@')).toMatch(/valid email/i)
    expect(validateEmail('elias@ourworldenergy')).toMatch(/valid email/i)
    expect(validateEmail('elias thorne@owe.com')).toMatch(/valid email/i)
  })

  it('requires something', () => {
    expect(validateEmail('')).toMatch(/email address/i)
  })

  it('accepts an ordinary address', () => {
    expect(validateEmail('elias.thorne@ourworldenergy.com')).toBeNull()
    expect(validateEmail('elias.thorne@ourworldenergy.com ')).toBeNull()
  })
})

describe('validateUserForm', () => {
  it('reports every bad field at once, keyed by control', () => {
    const errors = validateUserForm(
      dirtyForm({ fullName: 'Elias 2', email: 'nope', phoneNumber: '+1 555' }),
    )

    expect(errors.fullName).toMatch(/numbers/i)
    expect(errors.email).toMatch(/@/)
    expect(errors.phoneNumber).toMatch(/digits only/i)
  })

  it('stops at the role, since the scope rules depend on it', () => {
    const errors = validateUserForm(dirtyForm({ role: '' }))
    expect(errors.role).toMatch(/role/i)
    expect(errors.department).toBeUndefined()
    expect(errors.platforms).toBeUndefined()
  })

  it('is empty for a valid form', () => {
    expect(validateUserForm(dirtyForm({ phoneNumber: '5550000000' }))).toEqual({})
  })

  it('blocks submission through describeUserFormGap on a format error alone', () => {
    // Every required field is filled — only the shape is wrong.
    const form = dirtyForm({ fullName: 'Elias 2', phoneNumber: '5550000000' })
    expect(describeUserFormGap(form)).toMatch(/numbers/i)
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
