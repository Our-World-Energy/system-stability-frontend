/*
  Mock data for the Active Users chart on User Management. There is no analytics
  API yet, so the series is *generated* rather than listed: each bucket's value
  is derived deterministically from its calendar key, so the same day always
  yields the same numbers (stable renders, stable tests) while "today" and "this
  month" still mean what they say. Swap `seriesFor` for a fetch later — the
  returned `ActiveUsersSeries` is the shape the chart consumes.

  Every entry point takes `now` so callers (and tests) can pin the clock.
*/

/** Selectable windows behind the chart's range pills. */
export type ActiveUsersRange = 'today' | 'last_7_days' | 'this_month' | 'custom'

export const activeUsersRanges: { id: ActiveUsersRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'custom', label: 'Custom range' },
]

export interface ActiveUsersPoint {
  /** Axis caption for the bucket, e.g. "09:00" or "3 Aug". */
  label: string
  value: number
}

export interface ActiveUsersSeries {
  points: ActiveUsersPoint[]
  /** The equally long window immediately before, for the comparison line. */
  previous: ActiveUsersPoint[]
  average: number
  peak: number
  /** Change in average against `previous`; null when there is nothing to compare. */
  changePercent: number | null
  /** Caption for the window, e.g. "28 Jul – 3 Aug 2026". */
  caption: string
  granularity: 'hour' | 'day'
}

/** A custom window, as the two `<input type="date">` values backing it. */
export interface CustomRange {
  from: string
  to: string
}

/** Widest custom window we plot — beyond this the daily buckets stop being readable. */
export const MAX_CUSTOM_DAYS = 180

/* ── date helpers (local time, since the picker and the axis are both local) ── */

export function isoDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Parses `yyyy-mm-dd` as a local midnight; null when the input isn't a date. */
export function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dayLabel(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`
}

/* ── value generation ── */

/** Deterministic 0..1 from a bucket key (FNV-1a), standing in for real counts. */
function noise(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/** Daily active users: a weekday plateau with a pronounced weekend dip. */
function dailyValue(date: Date): number {
  const weekend = date.getDay() === 0 || date.getDay() === 6
  const base = weekend ? 430 : 940
  return Math.round(base + noise(isoDay(date)) * 260)
}

/** Hourly active users: a working-day bell centred on early afternoon. */
function hourlyValue(day: string, hour: number): number {
  const shape = Math.exp(-((hour - 14) ** 2) / 42)
  return Math.round(45 + shape * 520 + noise(`${day}:${hour}`) * 70)
}

/* ── series assembly ── */

function hourlyPoints(day: Date, throughHour: number): ActiveUsersPoint[] {
  const key = isoDay(day)
  return Array.from({ length: throughHour + 1 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}:00`,
    value: hourlyValue(key, hour),
  }))
}

/** Daily buckets from `start` to `end` inclusive. */
function dailyPoints(start: Date, end: Date): ActiveUsersPoint[] {
  const points: ActiveUsersPoint[] = []
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    points.push({ label: dayLabel(d), value: dailyValue(d) })
  }
  return points
}

function average(points: ActiveUsersPoint[]): number {
  if (!points.length) return 0
  return Math.round(points.reduce((sum, p) => sum + p.value, 0) / points.length)
}

function dayCaption(start: Date, end: Date): string {
  const year = end.getFullYear()
  if (isoDay(start) === isoDay(end)) return `${dayLabel(end)} ${year}`
  return `${dayLabel(start)} – ${dayLabel(end)} ${year}`
}

/**
 * Clamps a picked custom window: nothing in the future, `from` never after `to`,
 * and no wider than `MAX_CUSTOM_DAYS`. Returns null when either date is unparseable.
 */
export function clampCustomRange(range: CustomRange, now: Date): { start: Date; end: Date } | null {
  const from = parseIsoDay(range.from)
  const to = parseIsoDay(range.to)
  if (!from || !to) return null

  const today = parseIsoDay(isoDay(now))!
  const end = to > today ? today : to
  let start = from > end ? end : from
  const span = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  if (span > MAX_CUSTOM_DAYS) start = addDays(end, -(MAX_CUSTOM_DAYS - 1))
  return { start, end }
}

/** The default custom window offered when the picker first opens: the last week. */
export function defaultCustomRange(now: Date): CustomRange {
  return { from: isoDay(addDays(now, -6)), to: isoDay(now) }
}

/**
 * The series for `range`. `custom` is only read for the custom range, and an
 * unparseable one yields an empty series so the chart can show its empty state
 * instead of inventing data.
 */
export function activeUsersSeries(
  range: ActiveUsersRange,
  now: Date,
  custom?: CustomRange,
): ActiveUsersSeries {
  if (range === 'today') {
    const hour = now.getHours()
    return summarize(
      hourlyPoints(now, hour),
      hourlyPoints(addDays(now, -1), hour),
      `${dayLabel(now)} ${now.getFullYear()} · hourly`,
      'hour',
    )
  }

  const today = parseIsoDay(isoDay(now))!
  let start = today
  let end = today

  if (range === 'last_7_days') {
    start = addDays(today, -6)
  } else if (range === 'this_month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
  } else {
    const clamped = custom && clampCustomRange(custom, now)
    if (!clamped) return summarize([], [], 'Select a valid range', 'day')
    start = clamped.start
    end = clamped.end
  }

  const points = dailyPoints(start, end)
  // The comparison window is the same number of days, ending the day before.
  const previousEnd = addDays(start, -1)
  const previous = dailyPoints(addDays(previousEnd, -(points.length - 1)), previousEnd)
  return summarize(points, previous, dayCaption(start, end), 'day')
}

function summarize(
  points: ActiveUsersPoint[],
  previous: ActiveUsersPoint[],
  caption: string,
  granularity: 'hour' | 'day',
): ActiveUsersSeries {
  const now = average(points)
  const before = average(previous)
  return {
    points,
    previous,
    average: now,
    peak: points.length ? Math.max(...points.map((p) => p.value)) : 0,
    changePercent: before ? Math.round(((now - before) / before) * 100) : null,
    caption,
    granularity,
  }
}
