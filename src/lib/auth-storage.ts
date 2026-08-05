/*
  Storage keys shared by the axios interceptors and the auth store.

  They live in their own module so `lib/axios.ts` and `lib/api/client.ts` can clear
  the session on a 401 without importing the store (which imports axios back — a
  cycle).
*/

/** Bearer token. Read by the axios request interceptor on every call. */
export const TOKEN_KEY = 'token'

/** Cached profile of the signed-in user, so a reload keeps the name/role. */
export const USER_KEY = 'auth-user'

/** `expires_at` from the login response (RFC 3339). The JWT is valid 8 hours. */
export const EXPIRES_KEY = 'auth-expires-at'

/**
 * Whether the signed-in account still has to set a real password.
 *
 * Persisted rather than kept in memory only: it gates the whole app, so a reload
 * on the forced-change screen must not drop the user into the dashboard with the
 * temporary password still live.
 */
export const MUST_CHANGE_KEY = 'auth-must-change-password'

/** Drop every trace of the current session from localStorage. */
export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  localStorage.removeItem(MUST_CHANGE_KEY)
}
