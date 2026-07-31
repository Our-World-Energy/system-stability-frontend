import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/users-data'

/** Outline tint per clearance level, matching the registry design. */
const roleStyles: Record<UserRole, string> = {
  'System Admin': 'border-primary/60 text-primary-bright',
  'Security Op': 'border-indigo-400/60 text-indigo-300',
  Developer: 'border-line-bright text-fg-muted',
  'Pending Auth': 'border-degraded/70 text-degraded',
  Observer: 'border-line-bright text-fg-muted',
}

export function RolePill({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase',
        roleStyles[role],
      )}
    >
      {role}
    </span>
  )
}
