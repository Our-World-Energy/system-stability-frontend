/*
  Storage keys shared by the axios interceptors and the auth store.

  They live in their own module so `lib/axios.ts` can clear the session on a 401
  without importing the store (which imports axios back — a cycle).
*/

/** Bearer token. Read by the axios request interceptor on every call. */
export const TOKEN_KEY = 'token'

/** Cached profile of the signed-in user, so a reload keeps the name/role. */
export const USER_KEY = 'auth-user'

/** Drop every trace of the current session from localStorage. */
export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
