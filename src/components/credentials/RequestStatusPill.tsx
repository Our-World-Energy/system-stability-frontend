import { cn } from '@/lib/utils'
import type { RequestStatus } from '@/lib/api/types'

const map: Record<RequestStatus, string> = {
  pending: 'text-degraded border-degraded/30 bg-degraded/10',
  granted: 'text-healthy border-healthy/25 bg-healthy/10',
  denied: 'text-critical-bright border-critical/40 bg-critical/15',
  expired: 'text-fg-muted border-fg-subtle/40 bg-fg-subtle/10',
}

interface RequestStatusPillProps {
  status: RequestStatus
  className?: string
}

/** Elevation-request lifecycle badge used in the Request Log's table. */
export function RequestStatusPill({ status, className }: RequestStatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'font-mono text-[10px] font-bold tracking-[0.05em] uppercase',
        map[status],
        className,
      )}
    >
      {status}
    </span>
  )
}
