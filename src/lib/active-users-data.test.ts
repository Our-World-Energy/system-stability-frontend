import { describe, expect, it } from 'vitest'
import {
  MAX_CUSTOM_DAYS,
  activeUsersRequest,
  activeUsersSeries,
  clampCustomRange,
  defaultCustomRange,
  isoDay,
  parseIsoDay,
} from './active-users-data'
import type { ActiveUserStatsData } from './api/user-management.types'

// Pinned clock: Monday 3 August 2026, 09:30 local.
const NOW = new Date(2026, 7, 3, 9, 30)

function stats(overrides: Partial<ActiveUserStatsData> = {}): ActiveUserStatsData {
  return {
    start_date: '2026-08-01',
    end_date: '2026-08-03',
    average_daily_active_users: 900,
    peak_daily_active_users: 1000,
    percent_change_vs_previous_period: 2.1,
    daily: [
      { date: '2026-08-01', active_users: 800 },
      { date: '2026-08-02', active_users: 900 },
      { date: '2026-08-03', active_users: 1000 },
    ],
    previous_period_daily: [
      { date: '2026-07-29', active_users: 700 },
      { date: '2026-07-30', active_users: 800 },
      { date: '2026-07-31', active_users: 900 },
    ],
    ...overrides,
  }
}

describe('activeUsersRequest', () => {
  it('asks for a single day for today', () => {
    // Local calendar day, not UTC: at 09:30 those agree, but the helper must not
    // be reaching for toISOString either way.
    expect(activeUsersRequest('today', NOW)).toEqual({
      start_date: '2026-08-03',
      end_date: '2026-08-03',
    })
  })

  it('makes the trailing week inclusive of both ends', () => {
    expect(activeUsersRequest('last_7_days', NOW)).toEqual({
      start_date: '2026-07-28',
      end_date: '2026-08-03',
    })
  })

  it('runs this month from the first to today', () => {
    expect(activeUsersRequest('this_month', NOW)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-03',
    })
  })

  it('sends a custom window exactly as picked', () => {
    expect(activeUsersRequest('custom', NOW, { from: '2026-07-20', to: '2026-07-24' })).toEqual({
      start_date: '2026-07-20',
      end_date: '2026-07-24',
    })
  })

  it('clamps a custom window before it reaches the wire', () => {
    // A future end date would be a valid request the backend answers with zeros.
    expect(activeUsersRequest('custom', NOW, { from: '2026-08-01', to: '2026-12-25' })).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-03',
    })
  })

  it('refuses an unparseable custom window rather than sending a 400', () => {
    expect(activeUsersRequest('custom', NOW, { from: '', to: '2026-07-24' })).toBeNull()
  })
})

describe('activeUsersSeries', () => {
  it('labels both series by date and keeps them index-aligned', () => {
    const series = activeUsersSeries(stats())

    expect(series.points.map((p) => p.label)).toEqual(['1 Aug', '2 Aug', '3 Aug'])
    expect(series.points.map((p) => p.value)).toEqual([800, 900, 1000])
    expect(series.previous).toHaveLength(series.points.length)
    expect(series.previous[0].label).toBe('29 Jul')
  })

  it('totals the window, so a wider range never reports a smaller number', () => {
    const day = activeUsersSeries(
      stats({ daily: [{ date: '2026-08-03', active_users: 9 }], previous_period_daily: [] }),
    )
    // The same nine users, with six quiet days added around them. Averaging gave
    // 1.286 here, which read as the count having dropped.
    const week = activeUsersSeries(
      stats({
        average_daily_active_users: 1.2857,
        daily: [
          { date: '2026-07-28', active_users: 0 },
          { date: '2026-07-29', active_users: 0 },
          { date: '2026-08-03', active_users: 9 },
        ],
      }),
    )

    expect(day.total).toBe(9)
    expect(week.total).toBe(9)
    // The backend's per-day average is still carried, for the sub-line.
    expect(week.average).toBeCloseTo(1.2857)
  })

  it('keeps the peak the backend reported', () => {
    expect(activeUsersSeries(stats({ peak_daily_active_users: 77 })).peak).toBe(77)
  })

  it('compares totals, not averages, so the badge agrees with the headline', () => {
    // 2700 against 2400 — the backend's own percentage is against averages and
    // would be a different number beside a total.
    const up = activeUsersSeries(stats({ percent_change_vs_previous_period: 99 }))
    expect(up.changeLabel).toBe('+12.5%')
    expect(up.changeDirection).toBe('up')

    const down = activeUsersSeries(
      stats({
        daily: [{ date: '2026-08-01', active_users: 90 }],
        previous_period_daily: [{ date: '2026-07-31', active_users: 100 }],
      }),
    )
    expect(down.changeLabel).toBe('-10.0%')
    expect(down.changeDirection).toBe('down')

    const flat = activeUsersSeries(
      stats({
        daily: [{ date: '2026-08-01', active_users: 100 }],
        previous_period_daily: [{ date: '2026-07-31', active_users: 100 }],
      }),
    )
    expect(flat.changeLabel).toBe('0.0%')
    expect(flat.changeDirection).toBe('flat')
  })

  it('shows no badge when the previous window was empty', () => {
    // Every rise from nothing is infinite, and "+0.0%" would claim no change.
    const series = activeUsersSeries(stats({ previous_period_daily: [] }))

    expect(series.changeLabel).toBeNull()
    expect(series.changeDirection).toBe('flat')
  })

  it('captions a range, and a single day without repeating it', () => {
    expect(activeUsersSeries(stats()).caption).toBe('1 Aug – 3 Aug 2026')
    expect(
      activeUsersSeries(stats({ start_date: '2026-08-03', end_date: '2026-08-03' })).caption,
    ).toBe('3 Aug 2026')
  })

  it('keeps an all-zero series, which is real data and not an error', () => {
    const series = activeUsersSeries(
      stats({
        average_daily_active_users: 0,
        peak_daily_active_users: 0,
        percent_change_vs_previous_period: 0,
        daily: [
          { date: '2026-08-01', active_users: 0 },
          { date: '2026-08-02', active_users: 0 },
        ],
      }),
    )

    expect(series.points).toHaveLength(2)
    expect(series.total).toBe(0)
    expect(series.average).toBe(0)
  })
})

describe('parseIsoDay', () => {
  it('rejects a date that matches the shape but is not on the calendar', () => {
    expect(parseIsoDay('2026-02-31')).toBeNull()
    expect(parseIsoDay('2026-13-01')).toBeNull()
    expect(isoDay(parseIsoDay('2024-02-29')!)).toBe('2024-02-29') // Leap day is real.
  })
})

describe('clampCustomRange', () => {
  it('pulls a future end date back to today', () => {
    const clamped = clampCustomRange({ from: '2026-08-01', to: '2026-12-25' }, NOW)!

    expect(isoDay(clamped.end)).toBe('2026-08-03')
  })

  it('orders an inverted pair instead of returning nothing', () => {
    const clamped = clampCustomRange({ from: '2026-08-02', to: '2026-07-28' }, NOW)!

    expect(isoDay(clamped.start)).toBe('2026-07-28')
    expect(isoDay(clamped.end)).toBe('2026-07-28')
  })

  it('caps an over-wide window at the maximum span', () => {
    const clamped = clampCustomRange({ from: '2024-01-01', to: '2026-08-03' }, NOW)!
    const days = Math.round((clamped.end.getTime() - clamped.start.getTime()) / 86_400_000) + 1

    expect(days).toBe(MAX_CUSTOM_DAYS)
  })

  it('defaults the picker to the trailing week', () => {
    expect(defaultCustomRange(NOW)).toEqual({ from: '2026-07-28', to: '2026-08-03' })
  })
})
