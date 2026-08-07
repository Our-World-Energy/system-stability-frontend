import type { RoleKey } from '@/lib/api/user-management.types'

/*
  The role vocabulary that sidebar access control is written against.

  Kept separate from the auth store on purpose: `src/config/navigation.ts` needs
  the list of roles at module load, and importing the store there would drag the
  API client into the navigation config.
*/

/**
 * Every role key the backend issues, written as a map rather than an array so a
 * seventh role added to `RoleKey` fails the build here until it is listed — the
 * alternative being a role that silently sees nothing `rolesExcept` allows.
 */
const ALL_ROLES: Record<RoleKey, true> = {
  org_admin: true,
  platform_admin: true,
  dev_admin: true,
  executive_user: true,
  management_user: true,
  standard_user: true,
}

/** All six role keys. */
export const ROLE_KEYS = Object.keys(ALL_ROLES) as RoleKey[]

/**
 * Every role apart from the ones named — for "everyone but the admin sees this",
 * which is how a route hands its sidebar slot over to an admin-only counterpart
 * without the two entries ever both being visible.
 */
export function rolesExcept(...excluded: RoleKey[]): RoleKey[] {
  return ROLE_KEYS.filter((role) => !excluded.includes(role))
}
