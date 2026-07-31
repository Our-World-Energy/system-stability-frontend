/*
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ FRONTEND-ONLY STUBS — no network calls yet.                                 │
  │                                                                             │
  │ Every function below fakes its round trip so the whole login / forgot-       │
  │ password flow is clickable end to end. The real request is written out above │
  │ each stub: when the endpoint lands, delete the stub body, uncomment the      │
  │ request, and add `import { api } from './axios'` at the top. Nothing outside │
  │ this file needs to change — the pages, store and tests all call through      │
  │ these same four signatures.                                                 │
  └─────────────────────────────────────────────────────────────────────────────┘
*/

import { isAxiosError } from 'axios'
import { DEMO_OTP, findDemoAccount, updateDemoPassword } from './auth-demo'

/** Paths the flow will call, kept together so integration is a single edit. */
export const authEndpoints = {
  login: '/auth/login',
  requestOtp: '/auth/forgot-password',
  verifyOtp: '/auth/verify-otp',
  resetPassword: '/auth/reset-password',
} as const

/** Fake latency, so the buttons' pending states are visible while stubbed. */
const STUB_DELAY_MS = 650

const wait = (ms = STUB_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

export interface AuthUser {
  id?: string
  email: string
  name?: string
  role?: string
}

export interface LoginResult {
  token: string
  /** Optional — the token alone is enough to authenticate. */
  user: AuthUser | null
}

/**
 * Exchange credentials for a bearer token.
 *
 * Stubbed: only the accounts in lib/auth-demo.ts are accepted, so the rejection
 * path is testable too.
 *
 * Real call — POST /auth/login  { email, password } -> { token, user? }:
 *   const { data } = await api.post(authEndpoints.login, { email, password })
 *   if (typeof data?.token !== 'string' || !data.token) {
 *     throw new Error('The sign-in response did not include a token.')
 *   }
 *   return { token: data.token, user: data.user ?? null }
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  await wait()
  const account = findDemoAccount(email, password)
  if (!account) throw new Error('Invalid email or password.')
  return {
    token: `stub.${btoa(account.email)}.${Date.now()}`,
    user: { email: account.email, name: account.name, role: account.role },
  }
}

/**
 * Mail a one-time code to `email`. Also backs "Resend Code".
 *
 * Stubbed: always succeeds.
 *
 * Real call — POST /auth/forgot-password  { email } -> 204:
 *   await api.post(authEndpoints.requestOtp, { email })
 */
export async function requestPasswordOtp(email: string): Promise<void> {
  await wait()
  if (!email) throw new Error('Enter the email address on your account.')
}

/**
 * Trade a valid OTP for the short-lived token that authorizes the password change.
 *
 * Stubbed: only DEMO_OTP is accepted, so a wrong code exercises the error state.
 *
 * Real call — POST /auth/verify-otp  { email, code } -> { resetToken }:
 *   const { data } = await api.post(authEndpoints.verifyOtp, { email, code })
 *   if (typeof data?.resetToken !== 'string' || !data.resetToken) {
 *     throw new Error('The verification response did not include a reset token.')
 *   }
 *   return data.resetToken
 */
export async function verifyPasswordOtp(email: string, code: string): Promise<string> {
  await wait()
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your email.')
  if (code !== DEMO_OTP) throw new Error('That code is incorrect. Check your email and try again.')
  return `stub-reset.${btoa(`${email}:${code}`)}`
}

/**
 * Commit the new password using the token from `verifyPasswordOtp`.
 *
 * Stubbed: always succeeds.
 *
 * Real call — POST /auth/reset-password  { resetToken, password } -> 204:
 *   await api.post(authEndpoints.resetPassword, { resetToken, password })
 */
export async function resetPassword(resetToken: string, password: string): Promise<void> {
  await wait()
  if (!resetToken || !password) throw new Error('The reset link is no longer valid.')
  // Apply it to the demo account so signing in with the new password works. Reads
  // back the address this stub encoded into the token in verifyPasswordOtp — both
  // halves are throwaway and get deleted together at integration time.
  updateDemoPassword(emailFromStubToken(resetToken), password)
}

const STUB_TOKEN_PREFIX = 'stub-reset.'

function emailFromStubToken(resetToken: string): string {
  if (!resetToken.startsWith(STUB_TOKEN_PREFIX)) return ''
  try {
    return atob(resetToken.slice(STUB_TOKEN_PREFIX.length)).split(':')[0] ?? ''
  } catch {
    return ''
  }
}

/**
 * Best-effort human-readable reason a request failed, preferring the server's own
 * message so backend validation copy reaches the user verbatim. Already handles
 * axios errors, so it keeps working unchanged once the stubs above are replaced.
 */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | string | undefined
    const detail = typeof data === 'string' ? data : (data?.message ?? data?.error)
    if (typeof detail === 'string' && detail.trim()) return detail.trim()
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the authentication service.'
    if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
    // Stop here rather than falling through: an AxiosError's own `message` is
    // internal wording like "Request failed with status code 400", never
    // something to show a user.
    return fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
