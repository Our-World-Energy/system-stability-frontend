import { cn } from '@/lib/utils'
import type { ServiceStatus } from '@/lib/dashboard-data'

const map: Record<ServiceStatus, { label: string; cls: string; dot: string }> = {
  healthy: {
    label: 'HEALTHY',
    cls: 'text-healthy border-healthy/25 bg-healthy/10',
    dot: 'bg-healthy',
  },
  degraded: {
    label: 'DEGRADED',
    cls: 'text-degraded border-degraded/30 bg-degraded/10',
    dot: 'bg-degraded',
  },
  critical: {
    label: 'CRITICAL',
    cls: 'text-critical-bright border-critical/40 bg-critical/15',
    dot: 'bg-critical-bright',
  },
  vendor_silent: {
    label: 'NO FEED',
    cls: 'text-fg-muted border-fg-subtle/40 bg-fg-subtle/10',
    dot: 'bg-fg-subtle',
  },
}

interface StatusPillProps {
  status: ServiceStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const { label, cls, dot } = map[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5',
        'font-mono text-[10px] font-bold uppercase tracking-[0.05em]',
        cls,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
