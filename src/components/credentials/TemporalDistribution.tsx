import { cn } from '@/lib/utils'

interface TemporalDistributionProps {
  /** Requests-per-hour buckets, left (earliest) to right (latest). */
  buckets: number[]
  /** Left / middle / right axis captions. Defaults to a rolling 24-hour window. */
  axis?: [string, string, string]
  /** Per-bar tooltips, aligned with `buckets`. */
  titles?: string[]
  className?: string
}

/** Minimal bar chart of request volume over time; the tallest bar is highlighted. */
export function TemporalDistribution({
  buckets,
  axis = ['24h ago', '12h ago', 'Now'],
  titles,
  className,
}: TemporalDistributionProps) {
  const peak = Math.max(...buckets, 1)

  return (
    <section className={cn('border-line bg-surface rounded-lg border p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fg text-sm font-semibold">Temporal Distribution</h3>
        <span className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
          Requests / Hour
        </span>
      </div>

      <div className="flex h-40 items-end gap-1.5">
        {buckets.map((value, i) => {
          // Only highlight a real peak — with an all-zero series every bar would
          // otherwise light up as the maximum.
          const isPeak = value > 0 && value === peak
          return (
            <div
              key={i}
              title={titles?.[i] ?? `${value} requests`}
              // A 2% floor keeps an empty hour visible as a baseline tick.
              style={{ height: `${Math.max((value / peak) * 100, 2)}%` }}
              className={cn(
                'flex-1 rounded-t transition-colors',
                isPeak ? 'bg-primary-bright' : 'bg-primary/25 hover:bg-primary/40',
              )}
            />
          )
        })}
      </div>

      <div className="text-fg-subtle mt-2 flex justify-between font-mono text-[10px]">
        {axis.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  )
}
