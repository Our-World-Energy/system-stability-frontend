import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  activeUsersRanges,
  activeUsersSeries,
  defaultCustomRange,
  isoDay,
  type ActiveUsersPoint,
  type ActiveUsersRange,
  type CustomRange,
} from '@/lib/active-users-data'

const W = 600
const H = 240

/** Cardinal-spline path through `pts`, which gives the design's soft S-curve. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const tension = 0.2
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const prev = pts[i - 1] ?? pts[i]
    const curr = pts[i]
    const next = pts[i + 1]
    const after = pts[i + 2] ?? next
    const c1x = curr.x + (next.x - prev.x) * tension
    const c1y = curr.y + (next.y - prev.y) * tension
    const c2x = next.x - (after.x - curr.x) * tension
    const c2y = next.y - (after.y - curr.y) * tension
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`
  }
  return d
}

/**
 * Active users over a selectable window, as a filled area chart against the
 * equivalent previous window.
 *
 * "Today" buckets by hour and the other ranges by day; both series share one
 * scale so the comparison line is meaningful. The SVG stretches to its container
 * (`preserveAspectRatio="none"`) with non-scaling strokes, so the curve fills any
 * card width without thinning the line.
 */
export function ActiveUsersChart() {
  const gradientId = 'active-users-' + useId().replace(/:/g, '')
  // One clock for the whole render, so the series and the pickers' bounds agree.
  const now = useMemo(() => new Date(), [])

  const [range, setRange] = useState<ActiveUsersRange>('last_7_days')
  const [custom, setCustom] = useState<CustomRange>(() => defaultCustomRange(now))
  // The custom pickers float over the card rather than sitting in it, so the plot
  // keeps exactly the same height in every range.
  const [pickerOpen, setPickerOpen] = useState(false)
  const rangeBar = useRef<HTMLDivElement>(null)
  /** Index of the bucket under the cursor; null when the pointer is off the plot. */
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rangeBar.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerOpen])

  const chooseRange = (next: ActiveUsersRange) => {
    setRange(next)
    // Only the custom range has anything to pick; the others dismiss the panel.
    setPickerOpen(next === 'custom')
    // The old readout described buckets that are about to be replaced.
    setHovered(null)
  }

  const series = useMemo(() => activeUsersSeries(range, now, custom), [range, now, custom])
  const { points, previous, average, peak, changePercent, caption } = series

  // A single bucket (custom range of one day, or the first hour of today) has no
  // line to draw — repeat it so the chart reads as a flat level, not as nothing.
  const drawn = points.length === 1 ? [points[0], points[0]] : points

  // One scale across both series, with headroom so the peak doesn't touch the top.
  const values = [...drawn, ...previous].map((p) => p.value)
  const max = values.length ? Math.max(...values) : 1
  const min = values.length ? Math.min(...values) : 0
  const spread = max - min || 1
  const project = (series: ActiveUsersPoint[]) =>
    series.map((p, i) => ({
      x: series.length === 1 ? W / 2 : (i / (series.length - 1)) * W,
      y: H - ((p.value - min) / spread) * (H - 24) - 12,
    }))

  const line = smoothPath(project(drawn))
  // Marker coordinates for the real buckets (`drawn` may hold a padded duplicate).
  const plotted = project(points)

  /**
   * Nearest bucket to the cursor. Measured against the container's own width
   * rather than the viewBox, since `preserveAspectRatio="none"` means the two
   * don't share a scale.
   */
  const trackCursor = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    if (!width || points.length === 0) return
    const ratio = (e.clientX - left) / width
    const index = Math.round(ratio * (points.length - 1))
    setHovered(Math.min(Math.max(index, 0), points.length - 1))
  }

  const changeCustom = (patch: Partial<CustomRange>) => {
    setHovered(null)
    setCustom((current) => {
      const next = { ...current, ...patch }
      // Keep the pair ordered, so dragging one end past the other can't invert it.
      if (patch.from && next.from > next.to) next.to = next.from
      if (patch.to && next.to < next.from) next.from = next.to
      return next
    })
  }

  /*
    Remount key for the animated parts. Changing it restarts the CSS animations,
    which is what makes a tab switch draw the new curve on instead of snapping to
    it — a `d` transition can't do the job, since the ranges hold different
    numbers of buckets and so produce paths with different command counts.
  */
  const animationKey = range === 'custom' ? `custom:${custom.from}:${custom.to}` : range

  return (
    <section className="border-line bg-surface flex flex-col rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
            Active Users
          </h2>
          <p className="text-fg-subtle mt-1 font-mono text-[10px] tracking-[0.08em] uppercase">
            {caption}
          </p>
        </div>
        <div ref={rangeBar} className="relative">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Active users range">
            {activeUsersRanges.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={range === option.id}
                aria-expanded={option.id === 'custom' ? pickerOpen : undefined}
                onClick={() => chooseRange(option.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors',
                  range === option.id
                    ? 'border-primary/50 bg-primary/10 text-primary-bright'
                    : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Absolutely positioned: the panel overlays the card instead of adding a
              row to it, which is what made the plot shorter in the custom range. */}
          {pickerOpen && (
            <div className="border-line bg-surface absolute top-full right-0 z-20 mt-2 flex flex-wrap items-center gap-3 rounded-lg border p-3 shadow-lg">
              <DateField
                id="active-users-from"
                label="from"
                value={custom.from}
                max={custom.to}
                onChange={(from) => changeCustom({ from })}
              />
              <DateField
                id="active-users-to"
                label="to"
                value={custom.to}
                max={isoDay(now)}
                onChange={(to) => changeCustom({ to })}
              />
            </div>
          )}
        </div>
      </div>

      {/* The figures swap wholesale with the range, so they cross-fade with the curve. */}
      <div
        key={`stats-${animationKey}`}
        className="animate-fade-in mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
      >
        <p className="text-fg font-mono text-4xl font-bold tracking-tight">
          {average.toLocaleString()}
        </p>
        {changePercent !== null && (
          <p
            className={cn(
              'font-mono text-sm font-semibold',
              changePercent >= 0 ? 'text-primary-bright' : 'text-critical',
            )}
          >
            {changePercent >= 0 ? '+' : ''}
            {changePercent}%
          </p>
        )}
        <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
          avg · peak {peak.toLocaleString()}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Legend tone="bg-primary-bright" label="Active users" />
        <Legend tone="bg-fg-subtle" label="Previous period" />
      </div>

      {/* `mt-auto` pins the plot to the bottom of the card, so it sits at the same
          height whether or not the custom-range pickers are taking up space above
          — and whatever slack the neighbouring card's height leaves stays above it. */}
      {points.length === 0 ? (
        <p className="text-fg-muted mt-auto grid h-52 place-items-center pt-4 font-mono text-sm">
          No activity in this range
        </p>
      ) : (
        <div className="mt-auto pt-4">
          <div
            className="relative h-52 cursor-crosshair"
            onMouseMove={trackCursor}
            onMouseLeave={() => setHovered(null)}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-full w-full"
              fill="none"
              role="img"
              aria-label={`Active users, ${caption}: ${average.toLocaleString()} on average, peaking at ${peak.toLocaleString()}`}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary-bright)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--color-primary-bright)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Keyed on the range: a switch remounts these, restarting the
                  fill's fade and the line's draw-on. */}
              <path
                key={`area-${animationKey}`}
                d={`${line} L${W},${H} L0,${H} Z`}
                fill={`url(#${gradientId})`}
                className="animate-fade-in"
              />
              {previous.length > 1 && (
                <path
                  key={`previous-${animationKey}`}
                  d={smoothPath(project(previous))}
                  stroke="var(--color-fg-subtle)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  strokeOpacity="0.55"
                  vectorEffect="non-scaling-stroke"
                  className="animate-fade-in"
                />
              )}
              <path
                key={`line-${animationKey}`}
                d={line}
                // Normalised length, so one dash spans the curve at any width.
                pathLength="1"
                stroke="var(--color-primary-bright)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="animate-draw-line"
              />
            </svg>

            {/* Crosshair, marker and readout are HTML, not SVG: the stretched
                viewBox would squash a <circle> into an ellipse. The chart's
                aria-label already summarises the series, so this is decorative. */}
            {hovered !== null && plotted[hovered] && (
              <Cursor
                point={points[hovered]}
                previous={previous[hovered]}
                x={plotted[hovered].x / W}
                y={plotted[hovered].y / H}
              />
            )}
          </div>

          <div
            key={`ticks-${animationKey}`}
            className="text-fg-subtle animate-fade-in mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] uppercase"
          >
            {axisTicks(points).map((tick, i) => (
              <span key={`${tick}-${i}`}>{tick}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Hover readout: a vertical guide, a dot on the curve, and the bucket's numbers.
 *
 * `x` and `y` arrive as 0..1 fractions of the plot, so the overlay tracks the
 * curve at any card width. The tooltip flips side near the edges and drops below
 * the dot near the top, so it can never be clipped out of view.
 */
function Cursor({
  point,
  previous,
  x,
  y,
}: {
  point: ActiveUsersPoint
  /** Same bucket in the comparison window; absent for the shortest windows. */
  previous?: ActiveUsersPoint
  x: number
  y: number
}) {
  const left = `${x * 100}%`
  const alignX = x < 0.15 ? '0%' : x > 0.85 ? '-100%' : '-50%'
  const alignY = y < 0.3 ? '0.75rem' : 'calc(-100% - 0.75rem)'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="bg-line-bright absolute inset-y-0 w-px" style={{ left }} />
      <div
        className="bg-primary-bright ring-surface absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
        style={{ left, top: `${y * 100}%` }}
      />
      <div
        className="border-line bg-canvas absolute z-10 rounded-lg border px-2.5 py-1.5 whitespace-nowrap shadow-lg"
        style={{ left, top: `${y * 100}%`, transform: `translate(${alignX}, ${alignY})` }}
      >
        <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
          {point.label}
        </p>
        <p className="text-fg font-mono text-sm font-semibold">
          {point.value.toLocaleString()}
          <span className="text-fg-muted ml-1 text-[11px] font-normal">active</span>
        </p>
        {previous && (
          <p className="text-fg-subtle font-mono text-[10px]">
            prev {previous.value.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

/** First, middle and last bucket captions — enough to orient without crowding. */
function axisTicks(points: ActiveUsersPoint[]): string[] {
  if (points.length < 3) return points.map((p) => p.label)
  return [points[0].label, points[Math.floor((points.length - 1) / 2)].label, points.at(-1)!.label]
}

function DateField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string
  label: string
  value: string
  /** Upper bound — `to` stops at today, `from` stops at `to`. */
  max: string
  onChange: (value: string) => void
}) {
  return (
    // Label beside the field rather than above it, so the panel stays one row tall.
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-fg-muted font-mono text-[10px] font-semibold tracking-[0.08em] uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="border-line bg-input text-fg focus:border-primary focus:ring-primary/20 h-8 rounded-lg border px-2.5 font-mono text-[13px] transition-colors outline-none focus:ring-2"
      />
    </div>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="text-fg-muted flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  )
}
