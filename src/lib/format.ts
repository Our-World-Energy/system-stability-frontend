/*
  Presentation helpers shared by every credential-manager page.

  The API speaks in RFC3339 stamps, whole seconds and numeric user ids; the
  designs speak in "2024-01-01 14:22:05", "1h" and "AM". Keeping the translation
  in one module means a table, a modal and a stat card never disagree about how
  the same value reads.
*/

/** Wait-time bands used by the approval queue legend. */
export type WaitSeverity = 'healthy' | 'warning' | 'critical'

/** Minutes waited before a request is treated as breaching SLA (backend rule). */
export const SLA_BREACH_MINUTES = 60

/**
 * "2026-08-03 13:13:19" — the audit-log format the tables use, in local time.
 * Returns an em dash for a missing or unparseable stamp so a cell is never blank.
 */
export function formatTimestamp(iso?: string | null): string {
  const date = toDate(iso)
  if (!date) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** Clock portion only — "13:13:19". Used for the policy-check line. */
export function formatClock(iso?: string | null): string {
  const stamp = formatTimestamp(iso)
  return stamp === '—' ? stamp : stamp.slice(11)
}

/** Whole-second duration as the tables write it: "1h", "30m", "45s". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0h'
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}

/** Millisecond remainder as HH:MM:SS, clamped at zero. Drives grant countdowns. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Elapsed wait from fractional minutes: "42m 12s", "2h 53m". */
export function formatWait(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m 00s'
  const totalSeconds = Math.round(minutes * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  // Past an hour the seconds stop being useful and only add noise.
  return hours > 0 ? `${hours}h ${pad(mins)}m` : `${mins}m ${pad(secs)}s`
}

/** Colour band for a wait, matching the healthy/warning/critical legend. */
export function waitSeverity(minutes: number): WaitSeverity {
  if (minutes >= SLA_BREACH_MINUTES) return 'critical'
  if (minutes >= SLA_BREACH_MINUTES / 2) return 'warning'
  return 'healthy'
}

/** Avatar initials from a name or, failing that, from an identifier. */
export function initialsFrom(label: string): string {
  const words = label
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Display name for a numeric user id. The credential-manager routes identify
 * people by id only — there is no user lookup on this service — so the id is
 * shown in the directory style the designs use rather than invented into a name.
 */
export function formatUserRef(id?: number | null): string {
  return typeof id === 'number' ? `USR_${id}` : 'Unknown'
}

/** One decimal place, trailing ".0" removed: 85.7 → "85.7%", 94 → "94%". */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Number(value.toFixed(digits))}%`
}

/** Fractional minutes as a compact label: 23.5 → "23.5m". */
export function formatMinutes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0m'
  return `${Number(value.toFixed(1))}m`
}

/** Tag list as the designs write it: ["a","b"] → "A • B". */
export function formatTagLine(tags?: string[] | null): string {
  if (!tags?.length) return ''
  return tags.map((t) => t.toUpperCase()).join(' • ')
}

/**
 * Expand the API's sparse hourly buckets into a dense series ending at the
 * current hour.
 *
 * The service only sends hours that had activity, so charting the raw array
 * would silently compress a quiet night into a narrow, misleading shape. Missing
 * hours become explicit zeros.
 */
export function densifyHourly(
  buckets: { hour: string; count: number }[],
  hours = 24,
  now: Date = new Date(),
): { hour: Date; count: number }[] {
  const counts = new Map<number, number>()
  for (const bucket of buckets) {
    const date = toDate(bucket.hour)
    if (date) counts.set(startOfHour(date).getTime(), bucket.count)
  }

  const current = startOfHour(now).getTime()
  const series: { hour: Date; count: number }[] = []
  for (let i = hours - 1; i >= 0; i -= 1) {
    const stamp = current - i * 3_600_000
    series.push({ hour: new Date(stamp), count: counts.get(stamp) ?? 0 })
  }
  return series
}

/** "14:00" — the x-axis label for an hourly bucket. */
export function formatHourLabel(hour: Date): string {
  return `${String(hour.getHours()).padStart(2, '0')}:00`
}

function startOfHour(date: Date): Date {
  const copy = new Date(date)
  copy.setMinutes(0, 0, 0)
  return copy
}

function toDate(iso?: string | null): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}
