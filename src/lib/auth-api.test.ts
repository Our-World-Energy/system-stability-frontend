import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  authErrorMessage,
  login,
  requestPasswordOtp,
  resetPassword,
  verifyPasswordOtp,
} from './auth-api'
import { DEMO_OTP, demoAccounts } from './auth-demo'

const DEMO = demoAccounts[0]

describe('auth stubs', () => {
  it('login accepts a demo account and returns its profile', async () => {
    const result = await login(DEMO.email, DEMO.password)
    expect(result.token).toMatch(/^stub\./)
    expect(result.user).toMatchObject({
      email: DEMO.email,
      name: DEMO.name,
      role: DEMO.role,
    })
  })

  it('login matches the email case-insensitively', async () => {
    await expect(login(DEMO.email.toUpperCase(), DEMO.password)).resolves.toMatchObject({
      user: { email: DEMO.email },
    })
  })

  it('login rejects a wrong password, an unknown address, and blanks', async () => {
    await expect(login(DEMO.email, 'wrong')).rejects.toThrow(/invalid email or password/i)
    await expect(login('nobody@ourworldenergy.com', DEMO.password)).rejects.toThrow(
      /invalid email or password/i,
    )
    await expect(login('', '')).rejects.toThrow(/invalid email or password/i)
  })

  it('requesting a code needs an address, but accepts any', async () => {
    await expect(requestPasswordOtp('')).rejects.toThrow(/email address/i)
    await expect(requestPasswordOtp('anyone@ourworldenergy.com')).resolves.toBeUndefined()
  })

  it('OTP verification requires exactly six digits', async () => {
    await expect(verifyPasswordOtp('ops@owe.com', '123')).rejects.toThrow(/six-digit/i)
    await expect(verifyPasswordOtp('ops@owe.com', '12345a')).rejects.toThrow(/six-digit/i)
  })

  it('OTP verification accepts only the demo code', async () => {
    await expect(verifyPasswordOtp('ops@owe.com', '481902')).rejects.toThrow(/incorrect/i)
    await expect(verifyPasswordOtp('ops@owe.com', DEMO_OTP)).resolves.toMatch(/^stub-reset\./)
  })

  it('reset needs both a token and a password', async () => {
    await expect(resetPassword('', 'new-password')).rejects.toThrow(/no longer valid/i)
    await expect(resetPassword('tok', 'new-password')).resolves.toBeUndefined()
  })

  // Runs last and restores the fixture: demoAccounts is module-level mutable state.
  it('a completed reset makes the new password usable', async () => {
    const target = demoAccounts[1]
    const original = target.password
    try {
      const resetToken = await verifyPasswordOtp(target.email, DEMO_OTP)
      await resetPassword(resetToken, 'Brand@New9')

      await expect(login(target.email, 'Brand@New9')).resolves.toMatchObject({
        user: { email: target.email },
      })
      await expect(login(target.email, original)).rejects.toThrow(/invalid email or password/i)
    } finally {
      target.password = original
    }
  })
})

/** Builds an AxiosError shaped the way the interceptor chain would deliver one. */
function axiosFailure(data: unknown, status = 400) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: 'Bad Request',
    data,
    headers: {},
    config,
  })
}

describe('authErrorMessage', () => {
  it('prefers the server message over the fallback', () => {
    expect(authErrorMessage(axiosFailure({ message: 'Account locked' }), 'nope')).toBe(
      'Account locked',
    )
  })

  it('accepts an `error` key or a bare string body', () => {
    expect(authErrorMessage(axiosFailure({ error: 'Bad OTP' }), 'nope')).toBe('Bad OTP')
    expect(authErrorMessage(axiosFailure('Too many attempts'), 'nope')).toBe('Too many attempts')
  })

  it('explains an unreachable service', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(authErrorMessage(err, 'nope')).toMatch(/cannot reach/i)
  })

  it('falls back when the body carries nothing usable', () => {
    expect(authErrorMessage(axiosFailure({ detail: 'unhelpful' }), 'Could not sign you in.')).toBe(
      'Could not sign you in.',
    )
    expect(authErrorMessage({ weird: true }, 'Could not sign you in.')).toBe(
      'Could not sign you in.',
    )
  })
})
