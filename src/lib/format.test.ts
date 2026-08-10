import { describe, expect, it } from 'vitest'
import {
  densifyHourly,
  formatCountdown,
  formatDuration,
  formatMinutes,
  formatPercent,
  formatTagLine,
  formatTimestamp,
  formatUserRef,
  formatWait,
  initialsFrom,
  waitSeverity,
} from './format'

describe('formatDuration', () => {
  it('renders whole seconds the way the tables write them', () => {
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(86_400)).toBe('24h')
    expect(formatDuration(1800)).toBe('30m')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(0)).toBe('0h')
  })
})

describe('formatWait', () => {
  it('keeps seconds under an hour and drops them past it', () => {
    expect(formatWait(42.2)).toBe('42m 12s')
    expect(formatWait(173)).toBe('2h 53m')
    expect(formatWait(0)).toBe('0m 00s')
  })
})

describe('waitSeverity', () => {
  it('bands a wait against the 60-minute SLA', () => {
    expect(waitSeverity(5)).toBe('healthy')
    expect(waitSeverity(45)).toBe('warning')
    expect(waitSeverity(61)).toBe('critical')
  })
})

describe('formatTimestamp', () => {
  it('renders an RFC3339 stamp as the audit-log format (MM-DD-YYYY)', () => {
    // Built from local parts so the assertion holds in any timezone.
    const date = new Date(2026, 7, 3, 13, 13, 19)
    expect(formatTimestamp(date.toISOString())).toBe('08-03-2026 13:13:19')
  })

  it('never renders a blank cell for missing or unparseable input', () => {
    expect(formatTimestamp(undefined)).toBe('—')
    expect(formatTimestamp(null)).toBe('—')
    expect(formatTimestamp('not a date')).toBe('—')
  })
})

describe('formatCountdown', () => {
  it('renders HH:MM:SS and clamps at zero', () => {
    expect(formatCountdown(3_599_000)).toBe('00:59:59')
    expect(formatCountdown(-5000)).toBe('00:00:00')
  })
})

describe('initialsFrom / formatUserRef', () => {
  it('derives initials from names and identifiers alike', () => {
    expect(initialsFrom('Artemis Miller')).toBe('AM')
    expect(initialsFrom('USR_1')).toBe('U1')
    expect(initialsFrom('   ')).toBe('??')
  })

  it('shows a name string as-is, a numeric id in directory style, else Unknown', () => {
    expect(formatUserRef('Test User')).toBe('Test User')
    expect(formatUserRef(1)).toBe('USR_1')
    expect(formatUserRef('')).toBe('Unknown')
    expect(formatUserRef(undefined)).toBe('Unknown')
    expect(formatUserRef(null)).toBe('Unknown')
  })
})

describe('formatPercent / formatMinutes / formatTagLine', () => {
  it('trims pointless decimals', () => {
    expect(formatPercent(85.7)).toBe('85.7%')
    expect(formatPercent(94)).toBe('94%')
    expect(formatMinutes(23.5)).toBe('23.5m')
    expect(formatMinutes(0)).toBe('0m')
  })

  it('renders tags the way the designs write them', () => {
    expect(formatTagLine(['infrastructure', 'production'])).toBe('INFRASTRUCTURE • PRODUCTION')
    expect(formatTagLine([])).toBe('')
    expect(formatTagLine(undefined)).toBe('')
  })
})

describe('densifyHourly', () => {
  const now = new Date(2026, 7, 3, 14, 30)

  it('expands sparse buckets to a full window ending at the current hour', () => {
    const series = densifyHourly([], 24, now)
    expect(series).toHaveLength(24)
    expect(series.every((s) => s.count === 0)).toBe(true)
    expect(series[23].hour.getHours()).toBe(14)
    expect(series[0].hour.getHours()).toBe(15) // 23 hours earlier, previous day
  })

  it('places a reported hour in its own slot and zeroes the rest', () => {
    // The API omits quiet hours entirely; charting them raw would compress the
    // series and make a single busy hour look like a steady trend.
    const busy = new Date(2026, 7, 3, 12, 0)
    const series = densifyHourly([{ hour: busy.toISOString(), count: 8 }], 24, now)

    expect(series.filter((s) => s.count > 0)).toEqual([{ hour: busy, count: 8 }])
  })

  it('ignores buckets outside the window and unparseable hours', () => {
    const series = densifyHourly(
      [
        { hour: new Date(2020, 0, 1, 3, 0).toISOString(), count: 99 },
        { hour: 'nonsense', count: 5 },
      ],
      24,
      now,
    )
    expect(series.every((s) => s.count === 0)).toBe(true)
  })
})
