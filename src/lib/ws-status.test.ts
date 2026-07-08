import { describe, expect, it } from 'vitest'
import { formatDateTime, statusWord } from './ws-status'

describe('formatDateTime', () => {
  it('returns a non-empty local string for a valid ISO timestamp', () => {
    expect(formatDateTime('2026-07-08T14:53:11Z')).not.toBe('')
  })

  it('returns "" for null or invalid input', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})

describe('statusWord', () => {
  it('maps each status to a human label', () => {
    expect(statusWord('healthy')).toBe('Healthy')
    expect(statusWord('degraded')).toBe('Degraded')
    expect(statusWord('critical')).toBe('Critical')
    expect(statusWord('vendor_silent')).toBe('No feed')
  })
})
