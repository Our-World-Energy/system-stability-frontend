/*
  The user-management contract, typed exactly as the backend enforces it.

  Source: "User Management API — Frontend Integration Handbook" (dev_ashish
  branch). Field names are snake_case here on purpose: these are wire shapes, and
  renaming them in the type would hide a mismatch the compiler should catch. The
  camelCase form the UI edits lives in `lib/user-draft.ts`.

  All seven operations are POST, including the reads and the delete.
*/

/** The six role keys the backend accepts. Anything else returns 400 unknown role. */
export type RoleKey =
  | 'org_admin'
  | 'platform_admin'
  | 'dev_admin'
  | 'executive_user'
  | 'management_user'
  | 'standard_user'

/**
 * Which scope a role is granted against, and therefore which scope fields its
 * create/update payload may carry:
 *   - `all` / `development` → no scope fields at all
 *   - `platform`            → non-empty `platforms`
 *   - `department`          → `department`, plus optional `sub_departments`
 * Comes back from get-metadata as `roles[].scope_type`, so it is a plain string
 * in the wire type — `lib/api/user-payload.ts` keys off the role instead.
 */
export type ScopeType = 'all' | 'development' | 'platform' | 'department'

/**
 * Every response — success or error, any status code — arrives in this shape.
 *
 * `dbRecCount` is optional: the conventions section documents it on every
 * envelope while most endpoint examples omit it, so it stays optional until the
 * live API is confirmed. `data` is null on every error path, which is why success
 * is decided from the HTTP status and never from whether `data` is populated.
 */
export interface ApiEnvelope<T> {
  status: number
  message: string
  dbRecCount?: number
  data: T | null
}

export interface Role {
  id: number
  key: RoleKey
  name: string
  description: string
  scope_type: ScopeType | string
  can_rotate_credentials: boolean
  can_request_rotation: boolean
  rank: number
  /** Active (non-deleted) users holding this role. Only get-metadata sends it. */
  user_count?: number
}

export interface SubDepartment {
  id: number
  department_id: number
  name: string
}

export interface Department {
  id: number
  name: string
  /** Nested by get-metadata, so selecting a department needs no second request. */
  sub_departments?: SubDepartment[]
}

export interface Platform {
  id: number
  key: string
  name: string
}

/** A provisioned user, identical in shape across create/update/get-users. */
export interface UserRecord {
  id: number
  email: string
  full_name: string
  phone_number?: string
  description?: string
  role: Role
  /** Present only for department-scoped roles. */
  department?: Pick<Department, 'id' | 'name'>
  /** Present only for department-scoped roles; may be empty. */
  sub_departments?: SubDepartment[]
  /** Present only for platform_admin, and it is an array of keys, not objects. */
  platforms?: string[]
  status: string
  must_change_password: boolean
  created_by?: number
  created_at: string
  updated_at: string
  last_login_at?: string | null
}

/* ── 1. POST /login ───────────────────────────────────────────────────────── */

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginData {
  token: string
  /** RFC 3339. The JWT is valid 8 hours. */
  expires_at: string
  /** True right after an admin creates the account, until change-password runs. */
  must_change_password: boolean
}

/* ── 2. POST /create-user ─────────────────────────────────────────────────── */

/**
 * Scope fields are optional in the type but conditional at runtime, and the
 * backend rejects the wrong combination with a 400. Build this with
 * `buildCreateUserPayload` rather than by hand — see `lib/api/user-payload.ts`.
 * There is no password field; the backend generates the initial one.
 */
export interface CreateUserRequest {
  email: string
  full_name: string
  phone_number?: string
  description?: string
  role: RoleKey
  /** Required for management_user / standard_user. Exact, case-sensitive name. */
  department?: string
  /** Optional, and only alongside `department`. Names, not ids. */
  sub_departments?: string[]
  /** Required non-empty for platform_admin. Platform keys, not display names. */
  platforms?: string[]
}

export interface CreateUserData {
  user: UserRecord
  /** True only when the welcome email actually went out (prod via SendGrid). */
  email_sent: boolean
}

/* ── 3. POST /get-users ───────────────────────────────────────────────────── */

/** Every field optional — send `{}` for page 1, size 25, no filters. */
export interface GetUsersRequest {
  /** 1-indexed. Defaults to 1 when omitted or <= 0. */
  page?: number
  /** Defaults to 25 when omitted or <= 0. */
  page_size?: number
  /** Case-insensitive substring over full_name OR email — one field covers both. */
  search?: string
  /** Role keys. Omit or empty for all roles. Unknown keys match zero rows. */
  roles?: RoleKey[]
}

export interface GetUsersData {
  /** The FILTERED count, not the whole table — this is what drives pagination. */
  total: number
  page: number
  page_size: number
  /** Most-recently-created first. */
  users: UserRecord[]
}

/* ── 4. POST /update-user ─────────────────────────────────────────────────── */

/**
 * A full replace, not a partial patch — send the complete record every time. A
 * role change re-applies that role's scope rules, so rebuild the scope fields
 * fresh instead of carrying the old ones over.
 */
export interface UpdateUserRequest extends CreateUserRequest {
  user_id: number
}

export interface UpdateUserData {
  user: UserRecord
}

/* ── 5. POST /change-password ─────────────────────────────────────────────── */

/** Acts on the caller's own account — there is deliberately no user_id. */
export interface ChangePasswordRequest {
  current_password: string
  /** Minimum 8 characters, and must differ from current_password. */
  new_password: string
}

/* ── 6. POST /delete-user ─────────────────────────────────────────────────── */

/** Soft delete. Calling it twice on the same user 404s the second time. */
export interface DeleteUserRequest {
  user_id: number
}

/* ── 7. POST /get-metadata ────────────────────────────────────────────────── */

/** The live source of truth for every dropdown. Never hardcode these lists. */
export interface MetadataData {
  roles: Role[]
  departments: Department[]
  platforms: Platform[]
}
