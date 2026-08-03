import { describe, expect, it } from 'vitest'
import {
  formatDateTime,
  formatUptime,
  owedbIndicators,
  owedbSummary,
  statusWord,
} from './ws-status'

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

describe('formatUptime', () => {
  it('formats a full day as "1d 0h"', () => {
    expect(formatUptime(86400)).toBe('1d 0h')
  })

  it('formats sub-day / sub-hour durations', () => {
    expect(formatUptime(3 * 3600 + 12 * 60)).toBe('3h 12m')
    expect(formatUptime(5 * 60)).toBe('5m')
    expect(formatUptime(30)).toBe('1m') // never shows "0m" for a live service
  })

  it('returns undefined for non-positive / non-numeric input (e.g. vendor_silent)', () => {
    expect(formatUptime(0)).toBeUndefined()
    expect(formatUptime(-1)).toBeUndefined()
    expect(formatUptime(undefined)).toBeUndefined()
    expect(formatUptime('86400')).toBeUndefined()
  })
})

describe('owedbIndicators', () => {
  it('reports main + lite DB state with UP/DOWN and error tooltips', () => {
    expect(
      owedbIndicators({
        main_db: 'UP',
        main_db_error: '',
        lite_db: 'DOWN',
        lite_db_error: 'owe_lite_db connection is not initialized',
      }),
    ).toEqual([
      { label: 'Main DB', up: true, error: undefined },
      { label: 'Lite DB', up: false, error: 'owe_lite_db connection is not initialized' },
    ])
  })

  it('returns undefined when DB fields are empty (vendor_silent) so no chips render', () => {
    expect(owedbIndicators({ main_db: '', lite_db: '' })).toBeUndefined()
    expect(owedbIndicators({})).toBeUndefined()
  })
})

describe('owedbSummary', () => {
  it('prefers the error reason when present', () => {
    expect(
      owedbSummary({ message: 'Server Health Status', error_detail: 'owe_lite_db down' }),
    ).toBe('owe_lite_db down')
  })

  it('falls back to the health message when there is no error', () => {
    expect(owedbSummary({ message: 'Server Health Status', error_detail: '' })).toBe(
      'Server Health Status',
    )
  })

  it('returns undefined when neither is set', () => {
    expect(owedbSummary({})).toBeUndefined()
  })
})
