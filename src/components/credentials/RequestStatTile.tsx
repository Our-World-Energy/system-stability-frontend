import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RequestStatTileProps {
  label: string
  value: number | string
  hint: string
  icon: LucideIcon
  /** Accent color for the value + icon. */
  accent?: 'default' | 'granted' | 'denied' | 'pending'
}

const accents: Record<NonNullable<RequestStatTileProps['accent']>, string> = {
  default: 'text-fg',
  granted: 'text-healthy',
  denied: 'text-critical-bright',
  pending: 'text-degraded',
}

/** KPI tile for the Request Log's header (pending / granted / denied / expired). */
export function RequestStatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'default',
}: RequestStatTileProps) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-fg-subtle font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
          {label}
        </span>
        <Icon className={cn('size-4', accents[accent])} />
      </div>
      <p className={cn('mt-3 font-mono text-3xl font-semibold', accents[accent])}>{value}</p>
      <p className="text-fg-muted mt-1 text-xs">{hint}</p>
    </div>
  )
}
