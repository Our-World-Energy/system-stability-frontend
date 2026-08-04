import { cn } from '@/lib/utils'
import { formatCount, roleAllocation, roleAllocationUpdatedAt } from '@/lib/users-data'

const barTone: Record<string, string> = {
  primary: 'bg-primary-bright',
  accent: 'bg-indigo-400',
  pending: 'bg-degraded',
}

/** Headcount per clearance level, as proportional bars against the largest role. */
export function RoleAllocation() {
  const peak = Math.max(...roleAllocation.map((r) => r.count), 1)

  return (
    <section className="border-line bg-surface flex flex-col rounded-lg border p-5">
      <h2 className="text-fg text-base font-semibold">Role Allocation</h2>
      <p className="text-fg-muted mt-1 font-mono text-[10px] tracking-[0.08em] uppercase">
        User distribution per clearance level
      </p>

      <ul className="mt-6 space-y-5">
        {roleAllocation.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
                {row.label}
              </span>
              <span
                className={cn(
                  'font-mono text-sm font-semibold',
                  row.tone === 'pending' ? 'text-degraded' : 'text-fg',
                )}
              >
                {formatCount(row.count)}
              </span>
            </div>
            <div className="bg-surface-3 mt-2 h-1.5 overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full', barTone[row.tone])}
                // Floor at 1% so single-digit roles stay visible rather than vanishing.
                style={{ width: `${Math.max((row.count / peak) * 100, 1)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-fg-subtle mt-auto pt-6 text-left font-mono text-[10px] tracking-[0.08em] uppercase">
        Last updated: {roleAllocationUpdatedAt}
      </p>
    </section>
  )
}
