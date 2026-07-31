import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/users-data'

/** Outline tint per role — the three admin tiers read warmest, staff read neutral. */
const roleStyles: Record<UserRole, string> = {
  'Organizational Admin': 'border-primary/60 text-primary-bright',
  'Platform Admin': 'border-indigo-400/60 text-indigo-300',
  'Dev Admin': 'border-sky-400/60 text-sky-300',
  'Executive User': 'border-degraded/70 text-degraded',
  'Management User': 'border-line-bright text-fg',
  'Standard User': 'border-line-bright text-fg-muted',
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
