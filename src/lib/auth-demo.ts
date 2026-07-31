/*
  Dummy sign-in data for walking the auth flow before the real endpoints exist.

  DELETE THIS FILE at integration time. Doing so is the switch that turns off the
  on-screen hints too: `DEMO_MODE` gates <DemoHint>, and the only other importer
  is lib/auth-api.ts, whose stubs are being replaced in the same pass.
*/

export const DEMO_MODE = true

export interface DemoAccount {
  email: string
  password: string
  name: string
  role: string
}

/** Two accounts so the sidebar chip visibly changes with the signed-in role. */
export const demoAccounts: DemoAccount[] = [
  {
    email: 'admin@ourworldenergy.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'Credential Admin',
  },
  {
    email: 'ops@ourworldenergy.com',
    password: 'Ops@12345',
    name: 'Ops Lead',
    role: 'Grid Operations',
  },
]

/** The only code the stubbed OTP screen accepts. */
export const DEMO_OTP = '123456'

/** Match credentials to a demo account. Email is compared case-insensitively. */
export function findDemoAccount(email: string, password: string): DemoAccount | null {
  const needle = email.trim().toLowerCase()
  return demoAccounts.find((a) => a.email === needle && a.password === password) ?? null
}

/**
 * Point a demo account at a new password so the reset flow ends somewhere real —
 * finishing "Create a New Password" then signing in with it actually works.
 * In-memory only: a page reload restores the passwords listed above.
 *
 * Returns false when the address isn't a demo account, which is fine — the reset
 * screens accept any address.
 */
export function updateDemoPassword(email: string, password: string): boolean {
  const account = demoAccounts.find((a) => a.email === email.trim().toLowerCase())
  if (!account) return false
  account.password = password
  return true
}
