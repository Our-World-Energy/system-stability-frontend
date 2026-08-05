/*
  Turning the create/edit form into a create-user / update-user payload.

  The backend validates scope fields against the selected role and returns 400 on
  any mismatch, so the payload has to carry *exactly* the fields that role allows —
  not a superset with empty values. Sending `department: ""` to an org_admin is a
  400 ("department and platforms must be empty for this role"), and so is leaving a
  stale `platforms` array behind after switching a user from platform_admin to
  standard_user.

  That is why every builder here starts from the identity fields and adds scope
  fields per role, rather than starting from the form and deleting what does not
  apply. A field the role does not use is *absent from the object*, not undefined:
  same thing on the wire once JSON.stringify runs, but it makes the rule visible
  and lets the tests assert on key presence.

    org_admin / dev_admin / executive_user → no scope fields at all
    platform_admin                         → platforms (non-empty), nothing else
    management_user / standard_user        → department, optional sub_departments
*/

import type {
  CreateUserRequest,
  RoleKey,
  UpdateUserRequest,
  UserRecord,
} from './user-management.types'

/** Roles whose access is org-wide or environment-wide: they carry no scope. */
export const GLOBAL_ROLES = ['org_admin', 'dev_admin', 'executive_user'] as const

/** Roles scoped to a department, optionally narrowed to sub-departments. */
export const DEPARTMENT_ROLES = ['management_user', 'standard_user'] as const

/** Roles scoped to named platforms. */
export const PLATFORM_ROLES = ['platform_admin'] as const

const GLOBAL = new Set<string>(GLOBAL_ROLES)
const DEPARTMENTAL = new Set<string>(DEPARTMENT_ROLES)
const PLATFORM = new Set<string>(PLATFORM_ROLES)

/** True when the role takes no scope fields — hide every scope control. */
export function isGlobalRole(role: string): boolean {
  return GLOBAL.has(role)
}

/** True when the role requires a department (and allows sub-departments). */
export function needsDepartment(role: string): boolean {
  return DEPARTMENTAL.has(role)
}

/**
 * True when the role requires at least one platform.
 *
 * Note both department roles allow sub_departments — including management_user.
 * There is no role for which a department is required but sub-departments are
 * forbidden, so a single `needsDepartment` covers both controls.
 */
export function needsPlatforms(role: string): boolean {
  return PLATFORM.has(role)
}

/**
 * The camelCase shape the dialogs edit. Deliberately not the wire shape — the
 * form holds values for controls the current role may have hidden (so switching
 * role back does not lose what was typed), and the builders drop those.
 */
export interface UserFormValues {
  email: string
  fullName: string
  phoneNumber?: string
  /** Free-text justification. Sent as `description`. */
  description?: string
  /** Empty string while the dropdown is untouched, hence the wider type. */
  role: RoleKey | ''
  /** Exact, case-sensitive department name from get-metadata. */
  department?: string
  /** Exact sub-department names, which must belong to `department`. */
  subDepartments?: string[]
  /** Platform keys from get-metadata, never display names. */
  platforms?: string[]
}

/** Drop a blank/whitespace-only optional string rather than sending "". */
function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Build a create-user body from the form.
 *
 * @throws Error when the role is still unset — call `describeUserFormGap` first
 *   and keep the submit button disabled; this is the last-line guard, not the UX.
 */
export function buildCreateUserPayload(form: UserFormValues): CreateUserRequest {
  if (!form.role) throw new Error('Select a role before submitting.')

  // Identity fields, common to every role. phone_number and description are
  // optional and omitted when blank; there is no password field in this API.
  const payload: CreateUserRequest = {
    email: form.email.trim(),
    full_name: form.fullName.trim(),
    role: form.role,
  }

  const phone = optionalText(form.phoneNumber)
  if (phone) payload.phone_number = phone

  const description = optionalText(form.description)
  if (description) payload.description = description

  if (isGlobalRole(form.role)) {
    // No department, no sub_departments, no platforms — not even empty ones.
    return payload
  }

  if (needsPlatforms(form.role)) {
    // Keys only, de-duplicated, blanks dropped. An empty array still gets sent so
    // the backend's "at least one platform is required for this role" surfaces
    // rather than the field silently vanishing.
    payload.platforms = unique(form.platforms)
    return payload
  }

  if (needsDepartment(form.role)) {
    // Exact case-sensitive name. Sent even when blank so the backend answers
    // "department is required for this role" instead of the omission reading as
    // a global-scope payload.
    payload.department = form.department?.trim() ?? ''
    // Optional: omitted entirely means "the whole department". Only sent when the
    // admin actually narrowed the grant.
    const subs = unique(form.subDepartments)
    if (subs.length) payload.sub_departments = subs
    return payload
  }

  // Unreachable for the six documented roles. Returning the identity-only payload
  // lets the backend answer "unknown role" rather than inventing a scope guess.
  return payload
}

/**
 * Build an update-user body: the same rules plus `user_id`.
 *
 * This is a full replace, not a patch. Because the scope fields are rebuilt from
 * the role in the form rather than merged onto the existing record, changing a
 * user's role cannot leave the old department or platforms behind.
 */
export function buildUpdateUserPayload(
  userId: number,
  form: UserFormValues,
): UpdateUserRequest {
  return { user_id: userId, ...buildCreateUserPayload(form) }
}

/** Trimmed, de-duplicated, blanks removed — order preserved. */
function unique(values: string[] | undefined): string[] {
  if (!values?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

/**
 * Why the form cannot be submitted yet, or null when it can.
 *
 * Mirrors the backend's required-field rules so the dialog can disable its submit
 * button instead of relying on a round trip. The backend stays the authority — this
 * only catches what it would certainly reject.
 */
export function describeUserFormGap(form: UserFormValues): string | null {
  if (!form.fullName.trim()) return 'Enter the user’s full name.'
  if (!form.email.trim()) return 'Enter an email address.'
  if (!form.role) return 'Select a role.'
  if (needsDepartment(form.role) && !form.department?.trim()) {
    return 'This role is scoped to a department — select one.'
  }
  if (needsPlatforms(form.role) && !unique(form.platforms).length) {
    return 'A Platform Admin needs at least one platform.'
  }
  return null
}

/** Shorthand for gating a submit button. */
export function isUserFormComplete(form: UserFormValues): boolean {
  return describeUserFormGap(form) === null
}

/**
 * Pre-fill the edit form from a registry row.
 *
 * Only the scope the row's *current* role actually uses is carried across —
 * `department` on a platform_admin row would be stale data waiting to be sent.
 */
export function formValuesFromUser(user: UserRecord): UserFormValues {
  const role = user.role.key
  return {
    email: user.email,
    fullName: user.full_name,
    phoneNumber: user.phone_number ?? '',
    description: user.description ?? '',
    role,
    department: needsDepartment(role) ? (user.department?.name ?? '') : '',
    subDepartments: needsDepartment(role)
      ? (user.sub_departments?.map((sub) => sub.name) ?? [])
      : [],
    platforms: needsPlatforms(role) ? (user.platforms ?? []) : [],
  }
}

/** A blank create form. */
export const emptyUserForm: UserFormValues = {
  email: '',
  fullName: '',
  phoneNumber: '',
  description: '',
  role: '',
  department: '',
  subDepartments: [],
  platforms: [],
}
