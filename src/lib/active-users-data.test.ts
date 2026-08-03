import { describe, expect, it } from 'vitest'
import {
  MAX_CUSTOM_DAYS,
  activeUsersSeries,
  clampCustomRange,
  defaultCustomRange,
  isoDay,
} from './active-users-data'

// Pinned clock: Monday 3 August 2026, 09:30 local.
const NOW = new Date(2026, 7, 3, 9, 30)

describe('activeUsersSeries', () => {
  it('buckets today by hour, up to the current hour', () => {
    const series = activeUsersSeries('today', NOW)

    expect(series.granularity).toBe('hour')
    expect(series.points).toHaveLength(10) // 00:00 … 09:00
    expect(series.points[0].label).toBe('00:00')
    expect(series.points.at(-1)!.label).toBe('09:00')
    // Compared against the same hours yesterday, so the windows are equal length.
    expect(series.previous).toHaveLength(series.points.length)
  })

  it('covers the trailing week, ending today', () => {
    const series = activeUsersSeries('last_7_days', NOW)

    expect(series.granularity).toBe('day')
    expect(series.points).toHaveLength(7)
    expect(series.points[0].label).toBe('28 Jul')
    expect(series.points.at(-1)!.label).toBe('3 Aug')
    expect(series.caption).toBe('28 Jul – 3 Aug 2026')
    // The comparison window is the seven days immediately before.
    expect(series.previous).toHaveLength(7)
    expect(series.previous.at(-1)!.label).toBe('27 Jul')
  })

  it('runs this month from the first to today', () => {
    const series = activeUsersSeries('this_month', NOW)

    expect(series.points).toHaveLength(3) // 1–3 August
    expect(series.points[0].label).toBe('1 Aug')
    expect(series.caption).toBe('1 Aug – 3 Aug 2026')
  })

  it('is deterministic, so a range renders the same values every time', () => {
    const a = activeUsersSeries('last_7_days', NOW)
    const b = activeUsersSeries('last_7_days', NOW)

    expect(a.points).toEqual(b.points)
    expect(a.average).toBe(b.average)
    expect(a.peak).toBeGreaterThanOrEqual(a.average)
  })

  it('honours a custom range, inclusive of both ends', () => {
    const series = activeUsersSeries('last_7_days', NOW, undefined)
    const custom = activeUsersSeries('custom', NOW, { from: '2026-07-20', to: '2026-07-24' })

    expect(custom.points).toHaveLength(5)
    expect(custom.points[0].label).toBe('20 Jul')
    expect(custom.points.at(-1)!.label).toBe('24 Jul')
    // A different window means different numbers than the default range.
    expect(custom.average).not.toBe(series.average)
  })

  it('reports an empty series for an unparseable custom range', () => {
    const series = activeUsersSeries('custom', NOW, { from: '', to: '2026-07-24' })

    expect(series.points).toEqual([])
    expect(series.average).toBe(0)
    expect(series.changePercent).toBeNull()
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
