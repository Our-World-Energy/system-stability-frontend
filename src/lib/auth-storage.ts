/*
  Where the session lives, and the keys it lives under.

  Its own module so `lib/api/client.ts` can end the session on a 401 without
  importing the store (which imports axios back — a cycle).

  Two stores, chosen by the login screen's "Remember me":

    checked (default) → localStorage, so the session survives closing the browser,
                        up to the token's own 8-hour expiry
    unchecked         → sessionStorage, so it dies with the tab — the shared or
                        borrowed machine case

  Everything reads through `readSession`, which tries both. That matters for the
  axios interceptor: it cannot know which box was ticked, and the answer can change
  between sign-ins within one page load.
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

/**
 * Whether the last sign-in asked to be remembered, and the address it used.
 *
 * Both are preferences rather than session data: they stay in localStorage
 * whichever store the session went to, and they survive signing out — forgetting
 * the address on sign-out is precisely what the box is there to prevent.
 */
export const REMEMBER_KEY = 'auth-remember'
export const REMEMBERED_EMAIL_KEY = 'auth-remembered-email'

/** Every key that belongs to a session, in both stores. */
const SESSION_KEYS = [TOKEN_KEY, USER_KEY, EXPIRES_KEY, MUST_CHANGE_KEY] as const

/** Private browsing can refuse storage outright; a session in memory still works. */
function safely<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}

/**
 * A session value from whichever store holds it, localStorage first.
 *
 * Both are consulted rather than the remembered flag being trusted, so a stale
 * preference can never point a reader at an empty store while the token sits in
 * the other one.
 */
export function readSession(key: string): string | null {
  return safely(() => localStorage.getItem(key) ?? sessionStorage.getItem(key), null)
}

/**
 * Write a session value to the store `remember` selects, clearing the other so one
 * key can never exist in both — a signed-out-but-remembered token in the store
 * nobody is reading is exactly the bug this avoids.
 */
export function writeSession(key: string, value: string, remember = isRemembered()) {
  safely(() => {
    const [target, other] = remember
      ? [localStorage, sessionStorage]
      : [sessionStorage, localStorage]
    target.setItem(key, value)
    other.removeItem(key)
  }, undefined)
}

export function removeSession(key: string) {
  safely(() => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }, undefined)
}

/** True when the last sign-in ticked "Remember me". Defaults to true — that is what the app did before the box existed. */
export function isRemembered(): boolean {
  return safely(() => localStorage.getItem(REMEMBER_KEY), null) !== 'false'
}

/** Record the choice, and the address to offer next time (only when remembering). */
export function setRemembered(remember: boolean, email?: string) {
  safely(() => {
    localStorage.setItem(REMEMBER_KEY, String(remember))
    const address = email?.trim()
    if (remember && address) localStorage.setItem(REMEMBERED_EMAIL_KEY, address)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  }, undefined)
}

/** The address to prefill the login form with, if there is one. */
export function rememberedEmail(): string {
  return safely(() => localStorage.getItem(REMEMBERED_EMAIL_KEY), null) ?? ''
}

/**
 * Drop every trace of the current session, from both stores.
 *
 * The remembered address and the checkbox state are deliberately left alone: they
 * describe how to sign in next time, not who is signed in now.
 */
export function clearStoredSession() {
  for (const key of SESSION_KEYS) removeSession(key)
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
