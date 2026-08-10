/*
  The ten user-management routes, one function each.

    const { users, total } = await getUsers({ page: 2, search: 'jane' })

  Every route is a POST — including the reads and the delete — and every reply uses
  the shared `{ status, message, data }` envelope, which `postApi` unwraps. A
  non-2xx throws `ApiError` carrying the backend's own `message`, which is written
  to be shown to a user verbatim, so callers can put it straight in a toast.

  Success is decided by `postApi` from the HTTP status, never by inspecting `data`:
  every error path returns valid JSON in this same envelope with `data: null`.

  Access, per the handbook: `login`, `forgot-password` and `reset-password` are
  unprotected, `change-password` works for any authenticated role, and the other
  six are org_admin only (403 otherwise).
*/

import { ApiError, postApi } from './caller'
import { userManagementApi } from './client'
import { userManagementEndpoints as paths } from './endpoints'
import type {
  ActiveUserStatsData,
  ActiveUserStatsRequest,
  ChangePasswordRequest,
  CreateUserData,
  CreateUserRequest,
  GetUsersData,
  GetUsersRequest,
  LoginData,
  MetadataData,
  UpdateUserData,
  UpdateUserRequest,
  UserRecord,
} from './user-management.types'

/** What a 2xx with a null `data` means: the route succeeded but sent nothing back. */
function required<T>(data: T | null, what: string): T {
  if (data === null || data === undefined) {
    throw new ApiError('malformed', `The service did not return ${what}.`)
  }
  return data
}

/* ── 1. login ─────────────────────────────────────────────────────────────── */

/**
 * Exchange credentials for an 8-hour JWT.
 *
 * A wrong password is a 401 here, which is a form error rather than an expired
 * session — `client.ts` deliberately does not bounce to /login for a 401 raised
 * while already on /login, so the caller renders `ApiError.message` in place.
 */
export async function login(email: string, password: string): Promise<LoginData> {
  const { data } = await postApi<LoginData | null>(userManagementApi, paths.login, {
    email: email.trim(),
    password,
  })
  return required(data, 'a session token')
}

/* ── 2. get-metadata ──────────────────────────────────────────────────────── */

/**
 * Live roles, departments (with sub-departments nested) and the platform catalog —
 * the source of truth for every dropdown in the create/edit form.
 *
 * `roles[].user_count` is the live count of active users per role, which is what
 * the Role Allocation card renders.
 */
export async function getMetadata(): Promise<MetadataData> {
  // This route does not parse a body, but `{}` is valid for it either way.
  const { data } = await postApi<MetadataData | null>(userManagementApi, paths.getMetadata, {})
  return required(data, 'the form metadata')
}

/* ── 3. get-users ─────────────────────────────────────────────────────────── */

/**
 * The registry, with search, role filter and pagination applied server-side.
 *
 * `total` is the count *after* filtering, so it drives the pagination UI directly.
 * Rows come back most-recently-created first.
 */
export async function getUsers(params: GetUsersRequest = {}): Promise<GetUsersData> {
  // Unlike get-metadata this body IS parsed, and an empty one is a 400 — so the
  // defaults case has to send `{}` rather than nothing.
  const body: GetUsersRequest = {}
  if (params.page && params.page > 0) body.page = params.page
  if (params.page_size && params.page_size > 0) body.page_size = params.page_size
  const search = params.search?.trim()
  if (search) body.search = search
  if (params.roles?.length) body.roles = params.roles

  const { data } = await postApi<GetUsersData | null>(userManagementApi, paths.getUsers, body)
  return required(data, 'the user list')
}

/* ── 4. create-user ───────────────────────────────────────────────────────── */

/** A created user, plus which wording the backend used to describe it. */
export interface CreateUserOutcome extends CreateUserData {
  /** The envelope message — "user created" or "user reactivated". */
  message: string
  /**
   * True when this email belonged to a soft-deleted user and the call revived that
   * same record (same id, so its audit history stays on one identity) instead of
   * creating a new one. Both are successes; only the toast copy differs.
   */
  reactivated: boolean
}

/**
 * Provision a user, or reactivate a soft-deleted one with the same email. 201.
 *
 * Build `payload` with `buildCreateUserPayload` — the scope fields a role may carry
 * are validated server-side and the wrong combination is a 400. An email belonging
 * to a still-active user is a 409.
 */
export async function createUser(payload: CreateUserRequest): Promise<CreateUserOutcome> {
  const { data, message } = await postApi<CreateUserData | null>(
    userManagementApi,
    paths.createUser,
    payload,
  )
  const created = required(data, 'the created user')
  return { ...created, message, reactivated: /reactivat/i.test(message) }
}

/* ── 5. update-user ───────────────────────────────────────────────────────── */

/**
 * Replace a user's profile, role and scope. Not a patch — send the whole record.
 *
 * Build `payload` with `buildUpdateUserPayload`, which rebuilds the scope fields
 * from the selected role so a role change cannot leave stale scope behind. The
 * backend clears the old scope rows and inserts whatever the new role requires.
 * Password is never touched here.
 */
export async function updateUser(payload: UpdateUserRequest): Promise<UserRecord> {
  const { data } = await postApi<UpdateUserData | null>(
    userManagementApi,
    paths.updateUser,
    payload,
  )
  return required(data, 'the updated user').user
}

/* ── 6. change-password ───────────────────────────────────────────────────── */

/**
 * Change the caller's own password — there is no user_id, it is always "mine".
 * This is how the forced first-login flow resolves.
 *
 * `new_password` must be at least 8 characters and differ from the current one;
 * both are 400s with a ready-to-show message. On success the account's
 * `must_change_password` flips to false and `data` is null.
 */
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await postApi<null>(userManagementApi, paths.changePassword, body)
}

/* ── 7. get-active-user-stats ─────────────────────────────────────────────── */

/**
 * GA4-derived active users for an inclusive date range, plus the equally long
 * period before it. org_admin only — a 403 for everyone else.
 *
 * The numbers come from the backend's periodic sync of the GA4 property that
 * `src/analytics` feeds, so they lag live traffic by up to an hour. An all-zero
 * series is a valid answer (no activity), not a failure.
 *
 * `signal` is passed through so a fast run of range changes leaves no stale
 * request to land after the one the user is waiting for.
 */
export async function getActiveUserStats(
  range: ActiveUserStatsRequest,
  signal?: AbortSignal,
): Promise<ActiveUserStatsData> {
  const { data } = await postApi<ActiveUserStatsData | null>(
    userManagementApi,
    paths.activeUserStats,
    range,
    { signal },
  )
  return required(data, 'the active user stats')
}

/* ── 8. forgot-password ───────────────────────────────────────────────────── */

/**
 * Ask for a reset link to be mailed to `email`, and return the envelope message.
 *
 * The reply is deliberately identical whether the address belongs to an active
 * account, a disabled one, or nobody at all — that is what stops the route being
 * used to test which addresses are registered. So there is nothing here to branch
 * on: show the returned message and stop.
 *
 * The mailed link points at `<origin>/reset-password?token=…`, is good for an hour,
 * and requesting another one invalidates the previous unused link.
 */
export async function forgotPassword(email: string): Promise<string> {
  const { message } = await postApi<null>(userManagementApi, paths.forgotPassword, {
    email: email.trim(),
  })
  return message
}

/* ── 9. reset-password ────────────────────────────────────────────────────── */

/**
 * Set a new password using the token from the mailed link. No JWT — the token is
 * the identity.
 *
 * `token` is single-use: a second call with the same one fails as "invalid or
 * expired" even though the first succeeded, so callers must not fire this twice
 * (double-click, a re-run effect). Unknown, expired and already-used tokens all
 * come back with that same message, so they cannot be told apart in the UI.
 *
 * On success the old password stops working immediately and there is no session —
 * the user signs in again.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await postApi<null>(userManagementApi, paths.resetPassword, {
    token,
    new_password: newPassword,
  })
}

/* ── 10. delete-user ───────────────────────────────────────────────────────── */

/**
 * Soft-delete a user: the row stays in the database so past credential actions
 * remain attributed, but the user drops out of get-users and can no longer log in.
 *
 * Calling it twice on the same user 404s the second time. An admin deleting their
 * own account is a 400 — the UI hides the button for that row as well, but the
 * backend is the guarantee.
 */
export async function deleteUser(userId: number): Promise<void> {
  await postApi<null>(userManagementApi, paths.deleteUser, { user_id: userId })
}
