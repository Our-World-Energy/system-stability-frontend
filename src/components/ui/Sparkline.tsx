import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ServiceStatus } from '@/lib/dashboard-data'

const strokeColor: Record<ServiceStatus, string> = {
  healthy: 'var(--color-healthy)',
  degraded: 'var(--color-degraded)',
  critical: 'var(--color-critical-bright)',
  vendor_silent: 'var(--color-fg-subtle)',
}

interface SparklineProps {
  points: number[]
  status?: ServiceStatus
  className?: string
  /** Per-point tooltip text (e.g. "Degraded · 57ms · Jul 8, 2:53 PM"). When set, the chart is interactive. */
  labels?: string[]
  /** Per-point status, parallel to `points`. degraded/critical points get a persistent colored dot. */
  markers?: ServiceStatus[]
}

/** Dot color at a status *change*, tinted by the new state (recovery→green, etc.). */
const markerColor: Record<ServiceStatus, string> = {
  healthy: 'var(--color-healthy)',
  degraded: 'var(--color-degraded)',
  critical: 'var(--color-critical-bright)',
  vendor_silent: 'var(--color-fg-subtle)',
}

const W = 100
const H = 36

/**
 * Sparkline with a subtle status-tinted area fade. When `labels` are supplied
 * it becomes interactive: hovering shows a crosshair, a marker on the nearest
 * point, and a small tooltip with that point's value + time.
 */
export function Sparkline({
  points,
  status = 'healthy',
  className,
  labels,
  markers,
}: SparklineProps) {
  const gid = 'spark-' + useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const n = points.length
  const interactive = !!labels && labels.length === n

  if (n < 2) return <div className={className} aria-hidden="true" />

  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = W / (n - 1)

  const pts = points.map((p, i) => ({ x: i * step, y: H - ((p - min) / range) * (H - 4) - 2 }))
  const line = pts
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const color = strokeColor[status]

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const rx = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(n - 1, Math.round(rx * (n - 1)))))
  }

  const active = interactive && hover != null ? pts[hover] : null
  // Keep the tooltip inside the card: pin its edge on the first/last point.
  const shift =
    hover === 0 ? 'translate-x-0' : hover === n - 1 ? '-translate-x-full' : '-translate-x-1/2'

  return (
    <div
      className={cn('relative', className)}
      onMouseMove={interactive ? onMove : undefined}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={line}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {active && (
          <line
            x1={active.x}
            y1={0}
            x2={active.x}
            y2={H}
            stroke={color}
            strokeOpacity="0.35"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Dots ONLY at a status change (healthy↔degraded↔critical…), never on a steady
          state. HTML overlay so they render as true circles despite the SVG's stretch. */}
      {markers?.map((m, i) => {
        const changed = i > 0 && m !== markers[i - 1]
        if (!changed || i >= pts.length) return null
        return (
          <span
            key={i}
            className="border-surface pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              left: `${(i / (n - 1)) * 100}%`,
              top: `${(pts[i].y / H) * 100}%`,
              backgroundColor: markerColor[m],
            }}
          />
        )
      })}
      {active && (
        <span
          className="border-surface pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{
            left: `${(hover! / (n - 1)) * 100}%`,
            top: `${(active.y / H) * 100}%`,
            backgroundColor: color,
          }}
        />
      )}
      {active && labels && (
        <span
          className={cn(
            'border-line-bright bg-surface-3 text-fg pointer-events-none absolute bottom-full z-20 mb-1 rounded border px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap shadow-md',
            shift,
          )}
          style={{ left: `${(hover! / (n - 1)) * 100}%` }}
        >
          {labels[hover!]}
        </span>
      )}
    </div>
  )
}
