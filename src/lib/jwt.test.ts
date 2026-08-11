// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { analyticsUserId, isJwtExpired, readJwtClaims, tokenProfile } from './jwt'

/** A token carrying `claims`, shaped the way the backend issues one. */
function tokenWith(claims: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`
}

describe('readJwtClaims', () => {
  it('decodes the payload, padding and all', () => {
    // The backend strips base64 '=' padding; a decoder that does not restore it
    // reads nothing for certain payload lengths.
    const claims = readJwtClaims(tokenWith({ email: 'ops@ourworldenergy.com', role: 'org_admin' }))

    expect(claims?.email).toBe('ops@ourworldenergy.com')
    expect(claims?.role).toBe('org_admin')
  })

  it('treats an unreadable token as no claims rather than throwing', () => {
    // The token still goes to the backend, which is what actually judges it.
    expect(readJwtClaims(null)).toBeNull()
    expect(readJwtClaims('two.parts')).toBeNull()
    expect(readJwtClaims('header.!!!not-base64!!!.signature')).toBeNull()
  })
})

describe('analyticsUserId', () => {
  it('stringifies the numeric user id', () => {
    expect(analyticsUserId(tokenWith({ user_id: 42 }))).toBe('42')
  })

  it('never substitutes the email', () => {
    // GA4 must not receive PII, and the backend's sync matches on users.id — an
    // address would not match a row even if it were acceptable to send.
    expect(analyticsUserId(tokenWith({ email: 'ops@ourworldenergy.com' }))).toBeNull()
    expect(analyticsUserId(tokenWith({ user_id: '42' }))).toBeNull()
  })
})

describe('tokenProfile', () => {
  it('reads the profile claims under either spelling', () => {
    expect(
      tokenProfile(tokenWith({ full_name: 'Shubham Kumar', phone_number: '11213314314' })),
    ).toEqual({ fullName: 'Shubham Kumar', phoneNumber: '11213314314' })

    expect(tokenProfile(tokenWith({ name: 'Shubham Kumar', phone: '11213314314' }))).toEqual({
      fullName: 'Shubham Kumar',
      phoneNumber: '11213314314',
    })
  })

  it('reports null rather than an empty string when a claim is absent or blank', () => {
    // The account page renders "ask an admin" off these nulls, so a blank claim
    // must not read as a value the user simply has not set.
    expect(tokenProfile(tokenWith({ email: 'ops@ourworldenergy.com' }))).toEqual({
      fullName: null,
      phoneNumber: null,
    })
    expect(tokenProfile(tokenWith({ full_name: '   ' })).fullName).toBeNull()
    expect(tokenProfile(null)).toEqual({ fullName: null, phoneNumber: null })
    expect(tokenProfile('not-a-jwt')).toEqual({ fullName: null, phoneNumber: null })
  })
})

describe('isJwtExpired', () => {
  it('compares exp in seconds against the clock in milliseconds', () => {
    const now = Date.UTC(2026, 7, 11, 12, 0, 0)
    expect(isJwtExpired(tokenWith({ exp: now / 1000 - 60 }), now)).toBe(true)
    expect(isJwtExpired(tokenWith({ exp: now / 1000 + 60 }), now)).toBe(false)
  })

  it('counts an unreadable or unexpiring token as live', () => {
    // Guessing "expired" here would lock a user out of a session that still works.
    expect(isJwtExpired(tokenWith({ email: 'ops@ourworldenergy.com' }))).toBe(false)
    expect(isJwtExpired('not-a-jwt')).toBe(false)
  })
})
