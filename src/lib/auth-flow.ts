/*
  State for the three-step password reset (request OTP → verify → new password).

  It lives in sessionStorage rather than router state so refreshing mid-flow — or
  landing on /verify-otp from a mail client — doesn't drop the user into a dead
  end. Scoped to the tab and cleared the moment the reset completes.
*/

const KEY = 'auth-reset-flow'

/** How long a mailed code stays valid; drives the on-screen countdown. */
export const OTP_TTL_MS = 120_000

export interface ResetFlow {
  /** Address the code was mailed to. */
  email: string
  /** Epoch ms at which the current code expires. */
  expiresAt: number
  /** Set once the OTP is verified; authorizes the password change. */
  resetToken?: string
}

export function readResetFlow(): ResetFlow | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const flow = JSON.parse(raw) as ResetFlow
    return typeof flow?.email === 'string' && flow.email ? flow : null
  } catch {
    return null
  }
}

function write(flow: ResetFlow) {
  sessionStorage.setItem(KEY, JSON.stringify(flow))
}

/** Begin (or restart, on resend) the flow for `email` with a fresh expiry. */
export function startResetFlow(email: string, now: number = Date.now()): ResetFlow {
  const flow: ResetFlow = { email, expiresAt: now + OTP_TTL_MS }
  write(flow)
  return flow
}

/** Record the verified reset token, keeping the rest of the flow intact. */
export function setResetToken(resetToken: string): ResetFlow | null {
  const flow = readResetFlow()
  if (!flow) return null
  const next = { ...flow, resetToken }
  write(next)
  return next
}

export function clearResetFlow() {
  sessionStorage.removeItem(KEY)
}
