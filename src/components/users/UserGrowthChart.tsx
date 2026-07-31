import { useId } from 'react'
import { userGrowth } from '@/lib/users-data'

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
 * Trailing-30-day active-node count as a filled area chart.
 *
 * Both series share one scale so the comparison line is meaningful. The SVG
 * stretches to its container (`preserveAspectRatio="none"`) with non-scaling
 * strokes, so the curve fills any card width without thinning the line.
 */
export function UserGrowthChart() {
  const gradientId = 'growth-' + useId().replace(/:/g, '')
  const { total, changePercent, series, previousSeries } = userGrowth

  // One scale across both series, with headroom so the peak doesn't touch the top.
  const max = Math.max(...series, ...previousSeries)
  const min = Math.min(...series, ...previousSeries)
  const range = max - min || 1
  const project = (values: number[]) =>
    values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 24) - 12,
    }))

  const current = project(series)
  const previous = project(previousSeries)
  const line = smoothPath(current)

  return (
    <section className="border-line bg-surface rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
          User Growth
        </h2>
        <div className="flex items-center gap-4">
          <Legend tone="bg-primary-bright" label="Active nodes" />
          <Legend tone="bg-fg-subtle" label="Previous period" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-fg font-mono text-4xl font-bold tracking-tight">
          {total.toLocaleString()}
        </p>
        <p className="text-primary-bright font-mono text-sm font-semibold">
          {changePercent >= 0 ? '+' : ''}
          {changePercent}%
        </p>
      </div>

      <div className="mt-4 h-52">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          fill="none"
          role="img"
          aria-label={`Active nodes over the last 30 days, now ${total.toLocaleString()}, up ${changePercent} percent`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-bright)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary-bright)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gradientId})`} />
          <path
            d={smoothPath(previous)}
            stroke="var(--color-fg-subtle)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            strokeOpacity="0.55"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            stroke="var(--color-primary-bright)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="text-fg-subtle mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] uppercase">
        <span>T-30D</span>
        <span>T-15D</span>
        <span>Current</span>
      </div>
    </section>
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
