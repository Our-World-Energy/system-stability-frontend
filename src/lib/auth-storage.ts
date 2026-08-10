/*
  Storage keys shared by the axios interceptors and the auth store.

  They live in their own module so `lib/api/client.ts` can end the session on a 401
  without importing the store (which imports axios back — a cycle).
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

/**
 * Why the session ended, for the login screen to explain after the bounce.
 *
 * sessionStorage rather than router state, because ending a session is a full page
 * load (`window.location.href`) — router state would not survive it. Tab-scoped, so
 * a second tab does not inherit a notice about this one.
 */
export const SESSION_NOTICE_KEY = 'auth-session-notice'

/**
 * One wording for every 401, because the service sends one: an expired token and
 * "an admin just changed your access" arrive as the same status and the same
 * message. Naming both is the honest version — claiming either specifically would
 * be wrong half the time.
 */
export const SESSION_ENDED_NOTICE =
  'You were signed out because your session expired or your access was changed. Please sign in again.'

/** Drop every trace of the current session from localStorage. */
export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  localStorage.removeItem(MUST_CHANGE_KEY)
}

/** Set once a bounce is under way, so parallel 401s don't each fire a navigation. */
let ending = false

/**
 * The session is no longer usable: drop it and send the tab back to sign in.
 *
 * The backend re-checks the caller's live account state on every request, so a 401
 * is not only an expired token — an admin changing this user's role, or disabling
 * the account, invalidates the token immediately. Either way the stored token and
 * the cached role beside it are stale, and continuing to render a shell built from
 * them would show access the user no longer has.
 *
 * Clearing runs even on /login, where a 401 is just a rejected sign-in; only the
 * redirect (and the notice, which would be wrong there) is skipped.
 */
export function endSession(notice: string) {
  clearStoredSession()
  if (window.location.pathname.startsWith('/login')) return
  try {
    sessionStorage.setItem(SESSION_NOTICE_KEY, notice)
  } catch {
    // Private-mode sessionStorage can throw. The redirect matters; the copy doesn't.
  }
  if (ending) return
  ending = true
  window.location.href = '/login'
}

/**
 * Read the notice left by `endSession`, clearing it so it shows once. A later
 * manual visit to /login is not still explaining a sign-out from an hour ago.
 */
export function takeSessionNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(SESSION_NOTICE_KEY)
    if (notice) sessionStorage.removeItem(SESSION_NOTICE_KEY)
    return notice
  } catch {
    return null
  }
}
