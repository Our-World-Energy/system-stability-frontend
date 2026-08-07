import type { RoleKey } from '@/lib/api/user-management.types'

/*
  Who may do what to a credential's secret, keyed on the role a session carries.

  This mirrors the backend's per-role `can_rotate_credentials` / `can_request_rotation`
  flags (see `Role` in `user-management.types`). The session stores only the role
  *key* (not the full Role object), so the mapping is restated here — the backend
  still enforces the real rule; these only decide which controls a screen offers.
*/

/** Roles that rotate/update a credential's secret directly, no approval needed. */
export function canRotateCredentials(role: RoleKey | null | undefined): boolean {
  return role === 'org_admin' || role === 'platform_admin' || role === 'dev_admin'
}

/**
 * Roles that cannot rotate directly but may submit a rotation request (supplying
 * the new secret) for an admin to apply.
 */
export function canRequestRotation(role: RoleKey | null | undefined): boolean {
  return role === 'executive_user' || role === 'management_user'
}
