/*
  Reading the claims out of the login JWT.

  The login response carries only `{ token, expires_at, must_change_password }` —
  no profile — so the caller's own email and role are available nowhere else. The
  token this backend issues holds:

    { "email": "...", "role": "management_user", "exp": …, "iat": … }

  Note what is NOT there: a user id. So the "don't let an admin delete their own
  account" guard cannot compare ids; the registry matches the row's email against
  the session email instead, and the backend's 400 remains the real guarantee.

  This is a plain base64url decode, not verification. The signature can only be
  checked by the service that holds the key, so nothing here is a security
  decision — it reads a display name and gates which nav items are worth showing.
  Every protected route is authorised server-side regardless.
*/

import type { RoleKey } from '@/lib/api/user-management.types'

export interface JwtClaims {
  email?: string
  role?: RoleKey | string
  /**
   * Numeric `users.id`. The analytics integration needs it — see
   * `analyticsUserId` — and everything else in the app works without it, so it is
   * read defensively rather than assumed.
   */
  user_id?: number
  /** Seconds since the epoch, per the JWT spec. */
  exp?: number
  iat?: number
}

/** Decode a base64url segment, tolerating the stripped `=` padding. */
function decodeSegment(segment: string): string | null {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
    const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4)
    // decodeURIComponent/escape round trip so non-ASCII names survive atob, which
    // hands back Latin-1 bytes rather than UTF-8.
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
  } catch {
    return null
  }
}

/**
 * The token's claims, or null when it is not a readable JWT.
 *
 * Never throws: a malformed or stubbed token is a "no claims" case, not a crash —
 * the token still goes to the backend, which is the thing that judges it.
 */
export function readJwtClaims(token: string | null | undefined): JwtClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const json = decodeSegment(parts[1])
  if (!json) return null

  try {
    const claims = JSON.parse(json) as unknown
    if (!claims || typeof claims !== 'object') return null
    return claims as JwtClaims
  } catch {
    return null
  }
}

/**
 * The GA4 identity for this token: `String(users.id)`, or null when the token
 * carries no numeric `user_id`.
 *
 * Null is a real outcome, not a bug to route around: analytics identity is sent
 * only when the backend put an id in the token. There is deliberately no fallback
 * to `email` — GA4 must never receive PII, and the backend's sync job matches on
 * `user_code = users.id`, so an address would not match a row anyway.
 */
export function analyticsUserId(token: string | null | undefined): string | null {
  const id = readJwtClaims(token)?.user_id
  return Number.isInteger(id) ? String(id) : null
}

/**
 * True when the token's `exp` is in the past.
 *
 * Unreadable or unexpiring tokens count as not expired: the backend decides, and
 * guessing "expired" here would lock a user out of a session that still works.
 */
export function isJwtExpired(token: string | null | undefined, now = Date.now()): boolean {
  const exp = readJwtClaims(token)?.exp
  if (typeof exp !== 'number') return false
  return exp * 1000 <= now
}
