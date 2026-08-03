import { cn } from '@/lib/utils'

/**
 * Eligibility is not a field of its own on the API — it is the credential's
 * `auto_grant` flag, read from the requester's point of view.
 */
const map = {
  auto: {
    label: 'AUTO-GRANTS',
    cls: 'text-healthy border-healthy/25 bg-healthy/10',
    dot: 'bg-healthy',
  },
  approval: {
    label: 'REQUIRES APPROVAL',
    cls: 'text-fg-muted border-line-bright bg-surface-3',
  },
} as const

interface EligibilityBadgeProps {
  autoGrant: boolean
  className?: string
}

/** Pill indicating whether a credential grants instantly or needs review. */
export function EligibilityBadge({ autoGrant, className }: EligibilityBadgeProps) {
  const { label, cls, dot } = autoGrant ? map.auto : { ...map.approval, dot: undefined }
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
