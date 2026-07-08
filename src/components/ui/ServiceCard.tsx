import { TriangleAlert, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Service } from '@/lib/dashboard-data'
import { StatusPill } from './StatusPill'
import { Sparkline } from './Sparkline'

interface ServiceCardProps {
  service: Service
  /** 'lg' = Tier 1/2 modules (sparkline + big metric); 'sm' = Tier 3/4 compact rows. */
  size?: 'lg' | 'sm'
}

export function ServiceCard({ service, size = 'lg' }: ServiceCardProps) {
  const { name, vendor, status, updated, metric, metricLabel, note, sparkline, sparkLabels, sparkStatuses, detail, badge, comingSoon } =
    service
  const isCritical = status === 'critical'
  const isDegraded = status === 'degraded'
  const isSilent = status === 'vendor_silent'

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg border bg-surface p-4 transition-colors',
        'hover:z-20 hover:border-line-bright', // lift on hover so the tooltip sits above neighbours
        // Clip only coming-soon cards (for the blur); interactive cards must NOT clip
        // their hover tooltip.
        comingSoon && 'overflow-hidden',
        isCritical && !comingSoon ? 'border-critical/40 bg-critical/5' : 'border-line',
        size === 'lg' ? 'min-h-[168px]' : 'min-h-[96px]',
      )}
    >
      {/* "Coming Soon" overlay for cards with no live API feed */}
      {comingSoon && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <span className="rounded-full border border-line-bright bg-surface-3 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-muted shadow-sm">
            Coming Soon
          </span>
        </div>
      )}

      <div className={cn('flex flex-1 flex-col', comingSoon && 'pointer-events-none select-none blur-[3px] saturate-50')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">{vendor}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Live payload summary (wired cards only) */}
      {detail && (
        <p className="mt-2 truncate font-mono text-[10px] text-fg-subtle" title={detail}>
          {detail}
        </p>
      )}

      {size === 'lg' ? (
        <>
          {/* Body: sparkline or a status note */}
          {sparkline ? (
            <div className="mt-3 h-9 w-full">
              <Sparkline points={sparkline} status={status} labels={sparkLabels} markers={sparkStatuses} className="h-full w-full" />
            </div>
          ) : note ? (
            <p className="mt-3 flex-1 text-xs leading-relaxed text-fg-muted">{note}</p>
          ) : null}

          {/* Footer: metric + last-updated */}
          <div className="mt-auto flex items-end justify-between pt-3">
            <div className="min-w-0">
              {metricLabel && (
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                  {metricLabel}
                </p>
              )}
              {metric && (
                <p
                  className={cn(
                    'font-mono text-2xl font-semibold leading-tight',
                    isDegraded ? 'text-degraded' : isCritical ? 'text-critical-bright' : 'text-fg',
                  )}
                >
                  {metric}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {badge?.type === 'book' && <BookOpen className="size-4 text-fg-subtle" />}
              {badge?.type === 'pill' && (
                <span className="rounded bg-[#3a4a5f]/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-[#b7c8e1]">
                  {badge.text}
                </span>
              )}
              {sparkline && note && (
                <span
                  className={cn(
                    'flex items-center gap-1 font-mono text-[10px] font-bold uppercase',
                    isDegraded ? 'text-degraded' : 'text-fg-subtle',
                  )}
                >
                  <TriangleAlert className="size-3" />
                  {note}
                </span>
              )}
              <span className="font-mono text-[11px] text-fg-subtle">Updated {updated}</span>
            </div>
          </div>
        </>
      ) : (
        /* Compact (Tier 3/4) */
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p
            className={cn(
              'min-w-0 flex-1 truncate font-mono text-xs',
              isCritical
                ? 'text-critical-bright'
                : isSilent
                  ? 'italic text-fg-subtle'
                  : 'text-fg-muted',
            )}
          >
            {note}
          </p>
          <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{updated}</span>
        </div>
      )}
      </div>
    </div>
  )
}
