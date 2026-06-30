import { useId } from 'react'
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
}

/**
 * Non-interactive sparkline. Stroke + a subtle gradient area fade
 * (20% -> 0% opacity), tinted by the current semantic status color.
 */
export function Sparkline({ points, status = 'healthy', className }: SparklineProps) {
  const gid = 'spark-' + useId().replace(/:/g, '')
  const W = 100
  const H = 36
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = W / (points.length - 1)

  const coords = points.map((p, i) => {
    const x = i * step
    const y = H - ((p - min) / range) * (H - 4) - 2
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const color = strokeColor[status]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
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
    </svg>
  )
}
