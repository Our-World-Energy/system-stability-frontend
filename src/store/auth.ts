import { create } from 'zustand'
import { login as loginRequest } from '@/lib/api/user-management'
import type { LoginData, RoleKey } from '@/lib/api/user-management.types'
import {
  EXPIRES_KEY,
  MUST_CHANGE_KEY,
  TOKEN_KEY,
  USER_KEY,
  clearStoredSession,
  readSession,
  removeSession,
  setRemembered,
  writeSession,
} from '@/lib/auth-storage'
import { readJwtClaims } from '@/lib/jwt'

/**
 * Who is signed in. Assembled from the JWT's claims, because the login response
 * carries only the token, its expiry, and the forced-password flag — no profile.
 *
 * There is no `id`: the token does not carry one. Anything that needs to recognise
 * "me" in a list of users has to match on `email`.
 */
export interface AuthUser {
  email: string
  /** Role key from the token, or null when the token was unreadable. */
  role: RoleKey | null
  /** Display label for the role, e.g. "Organizational Admin". */
  roleLabel: string
}

/**
 * Display names for the six role keys.
 *
 * get-metadata is the source of truth for anything the user *chooses* — this map
 * only labels the already-signed-in user's own role in the sidebar, which has to
 * render before (and without) an org_admin-only metadata call.
 */
const ROLE_LABELS: Record<RoleKey, string> = {
  org_admin: 'Organizational Admin',
  platform_admin: 'Platform Admin',
  dev_admin: 'Dev Admin',
  executive_user: 'Executive User',
  management_user: 'Management User',
  standard_user: 'Standard User',
}

/** Display label for a role key, falling back to a readable form of the key. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Unknown role'
  return ROLE_LABELS[role as RoleKey] ?? role.replace(/_/g, ' ')
}

/** Build the session profile from a token's claims. */
function userFromToken(token: string): AuthUser | null {
  const claims = readJwtClaims(token)
  if (!claims?.email) return null
  const role = (claims.role as RoleKey | undefined) ?? null
  return { email: claims.email, role, roleLabel: roleLabel(role) }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  /** RFC 3339 expiry from the login response, for reference/debugging. */
  expiresAt: string | null
  /**
   * True while the account is still on its backend-generated password. The app
   * shell is closed until change-password succeeds.
   */
  mustChangePassword: boolean

  /**
   * POST /login, then persist the session. Throws ApiError on failure.
   *
   * `remember` decides where the session is kept — localStorage across browser
   * restarts, or sessionStorage for this tab only — and whether the address is
   * offered back on the login screen next time.
   */
  logIn: (email: string, password: string, remember?: boolean) => Promise<LoginData>
  /** Persist a session from an already-obtained login response. */
  signIn: (data: LoginData) => void
  /** Called after change-password succeeds — reopens the app. */
  clearMustChangePassword: () => void
  signOut: () => void
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = readSession(USER_KEY)
    if (raw) return JSON.parse(raw) as AuthUser
  } catch {
    // Corrupt entry — fall through and re-derive from the token below.
  }
  const token = readSession(TOKEN_KEY)
  return token ? userFromToken(token) : null
}

/*
  Deliberately not using zustand's `persist`: the axios request interceptor reads
  the stored token directly, so web storage stays the single source of truth and
  the store writes through to it. Two persisted copies would drift.
*/
export const useAuthStore = create<AuthState>((set) => ({
  token: readSession(TOKEN_KEY),
  user: readStoredUser(),
  expiresAt: readSession(EXPIRES_KEY),
  mustChangePassword: readSession(MUST_CHANGE_KEY) === 'true',

  logIn: async (email, password, remember = true) => {
    // Drop any stale session first, so a failed login cannot leave the previous
    // user's token attached to the next request.
    clearStoredSession()
    // Recorded before the request, so `signIn` (and anything else writing session
    // keys afterwards) already knows which store this session belongs in. The
    // address is only kept when the box was ticked.
    setRemembered(remember, email)
    const data = await loginRequest(email, password)
    useAuthStore.getState().signIn(data)
    return data
  },

  signIn: ({ token, expires_at, must_change_password }) => {
    const user = userFromToken(token)

    writeSession(TOKEN_KEY, token)
    if (user) writeSession(USER_KEY, JSON.stringify(user))
    else removeSession(USER_KEY)
    if (expires_at) writeSession(EXPIRES_KEY, expires_at)
    // Written as a string either way: an absent key would be indistinguishable
    // from "not yet known" on the next reload.
    writeSession(MUST_CHANGE_KEY, String(Boolean(must_change_password)))

    set({
      token,
      user,
      expiresAt: expires_at ?? null,
      mustChangePassword: Boolean(must_change_password),
    })
  },

  clearMustChangePassword: () => {
    writeSession(MUST_CHANGE_KEY, 'false')
    set({ mustChangePassword: false })
  },

  signOut: () => {
    clearStoredSession()
    set({ token: null, user: null, expiresAt: null, mustChangePassword: false })
  },
}))

/** True when the signed-in user may reach the org_admin-only registry routes. */
export function useIsOrgAdmin(): boolean {
  return useAuthStore((s) => s.user?.role === 'org_admin')
}
