/*
  The Active Users chart's two halves that are not rendering: turning a range pill
  into the dates the API wants, and turning the API's reply into what the chart
  draws.

  Counts come from `get-active-user-stats`, which the backend fills from its
  periodic sync of the GA4 property that `src/analytics` feeds. Buckets are whole
  local days — GA4 daily rows are all the backend stores, so there is no hourly
  view even for "Today", which is a single day's bucket.

  Nothing here recomputes an average, a peak or a percentage: the backend sends
  all three, and deriving them again in the browser would be a second source of
  truth that drifts from the one on the wire.

  Every entry point takes `now` so callers (and tests) can pin the clock.
*/

import type { ActiveUserPoint, ActiveUserStatsData } from '@/lib/api/user-management.types'

/** Selectable windows behind the chart's range pills. */
export type ActiveUsersRange = 'today' | 'last_7_days' | 'this_month' | 'custom'

export const activeUsersRanges: { id: ActiveUsersRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'custom', label: 'Custom range' },
]

export interface ActiveUsersPoint {
  /** Axis caption for the bucket, e.g. "3 Aug". */
  label: string
  value: number
}

export interface ActiveUsersSeries {
  points: ActiveUsersPoint[]
  /** The equally long window immediately before, for the comparison line. */
  previous: ActiveUsersPoint[]
  /** Every day's count added up — the headline figure. */
  total: number
  /** Backend's average per day across the window. */
  average: number
  peak: number
  /** Change in total against `previous`, already formatted, e.g. "+2.1%". Null
   *  when the previous window has no activity to compare against. */
  changeLabel: string | null
  /** Sign of that change, for the colour. */
  changeDirection: 'up' | 'down' | 'flat'
  /** Caption for the window, e.g. "28 Jul – 3 Aug 2026". */
  caption: string
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
  // Rejects the impossible dates a regex still matches, e.g. 2026-02-31.
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1) return null
  if (date.getDate() !== Number(d)) return null
  return date
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dayLabel(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`
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

/* ── range pill → request ── */

/**
 * The inclusive `YYYY-MM-DD` bounds to ask for. Null when a custom range is
 * unusable, which is the chart's cue to show its empty state rather than send a
 * request the backend would reject.
 *
 * Local calendar days throughout, never `toISOString()`: near midnight the UTC
 * conversion lands on the wrong day for anyone west of Greenwich, so "Today"
 * would quietly ask for yesterday.
 */
export function activeUsersRequest(
  range: ActiveUsersRange,
  now: Date,
  custom?: CustomRange,
): { start_date: string; end_date: string } | null {
  const today = parseIsoDay(isoDay(now))!

  if (range === 'today') return { start_date: isoDay(today), end_date: isoDay(today) }
  if (range === 'last_7_days') {
    // Inclusive: today plus the previous six days.
    return { start_date: isoDay(addDays(today, -6)), end_date: isoDay(today) }
  }
  if (range === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start_date: isoDay(first), end_date: isoDay(today) }
  }

  const clamped = custom && clampCustomRange(custom, now)
  if (!clamped) return null
  return { start_date: isoDay(clamped.start), end_date: isoDay(clamped.end) }
}

/* ── response → chart series ── */

function toPoints(daily: ActiveUserPoint[]): ActiveUsersPoint[] {
  return daily.map((point) => {
    const date = parseIsoDay(point.date)
    return {
      // An unparseable date keeps its raw string rather than being dropped: the
      // count is still real, and a gap in the line would misrepresent it.
      label: date ? dayLabel(date) : point.date,
      value: point.active_users,
    }
  })
}

function caption(start: string, end: string): string {
  const from = parseIsoDay(start)
  const to = parseIsoDay(end)
  if (!from || !to) return `${start} – ${end}`
  if (start === end) return `${dayLabel(to)} ${to.getFullYear()}`
  return `${dayLabel(from)} – ${dayLabel(to)} ${to.getFullYear()}`
}

function sum(points: ActiveUsersPoint[]): number {
  return points.reduce((running, point) => running + point.value, 0)
}

/**
 * The chart's view of one API response.
 *
 * The two series are compared by index, which is what the backend guarantees:
 * equal lengths, zero-filled, previous period immediately before this one. Each
 * point keeps its own label so the tooltip can name both dates.
 *
 * The headline is the TOTAL over the window, not the backend's
 * `average_daily_active_users`: a widening range would otherwise shrink the
 * number it reports, because the quiet days get averaged in — nine users today
 * reads as 1.3 across a week in which the other six days were empty.
 *
 * Worth knowing what that total is: it adds daily counts, so somebody active on
 * three days counts three times. It is user-days, not distinct people. Only GA4
 * can deduplicate people across a range, and the daily rows the backend stores
 * cannot be made to answer it — so a wider window always reads higher here.
 * `average` is kept alongside for the same reason it always was.
 */
export function activeUsersSeries(data: ActiveUserStatsData): ActiveUsersSeries {
  const points = toPoints(data.daily ?? [])
  const previous = toPoints(data.previous_period_daily ?? [])

  // Compared on the same basis as the headline. The backend's
  // `percent_change_vs_previous_period` is an average-against-average figure, so
  // showing it next to a total would have the badge disagreeing with the number
  // above it.
  const total = sum(points)
  const previousTotal = sum(previous)
  const change = previousTotal ? ((total - previousTotal) / previousTotal) * 100 : null

  return {
    points,
    previous,
    total,
    average: data.average_daily_active_users,
    peak: data.peak_daily_active_users,
    // No badge at all when the previous window was empty — every increase from
    // nothing is infinite, and "+0.0%" would read as "no change".
    changeLabel: change === null ? null : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    changeDirection: !change ? 'flat' : change > 0 ? 'up' : 'down',
    caption: caption(data.start_date, data.end_date),
  }
}

/** What the chart shows before the first response, and when a range is unusable. */
export const EMPTY_SERIES: ActiveUsersSeries = {
  points: [],
  previous: [],
  total: 0,
  average: 0,
  peak: 0,
  changeLabel: null,
  changeDirection: 'flat',
  caption: '',
}
