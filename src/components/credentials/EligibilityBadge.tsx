import { cn } from '@/lib/utils'
import type { Eligibility } from '@/lib/credentials-data'

const map: Record<Eligibility, { label: string; cls: string; dot?: string }> = {
  auto_grants: {
    label: 'AUTO-GRANTS',
    cls: 'text-healthy border-healthy/25 bg-healthy/10',
    dot: 'bg-healthy',
  },
  requires_approval: {
    label: 'REQUIRES APPROVAL',
    cls: 'text-fg-muted border-line-bright bg-surface-3',
  },
}

interface EligibilityBadgeProps {
  eligibility: Eligibility
  className?: string
}

/** Pill indicating whether a credential grants instantly or needs review. */
export function EligibilityBadge({ eligibility, className }: EligibilityBadgeProps) {
  const { label, cls, dot } = map[eligibility]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-bold tracking-[0.05em] uppercase',
        cls,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {label}
    </span>
  )
}
