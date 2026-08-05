import { cn } from '@/lib/utils'
import { allocationTone, byRankDescending, formatCount } from '@/lib/role-display'
import type { Role } from '@/lib/api/user-management.types'

/**
 * Headcount per clearance level, as proportional bars against the largest role.
 *
 * The counts are `roles[].user_count` from get-metadata — live counts of active
 * (non-deleted) users — so the card moves whenever a user is created, re-roled or
 * removed, which is why every registry mutation invalidates the metadata query.
 */
export function RoleAllocation({ roles }: { roles: Role[] }) {
  const rows = byRankDescending(roles)
  const peak = Math.max(...rows.map((r) => r.user_count ?? 0), 1)

  return (
    <section className="border-line bg-surface flex flex-col rounded-lg border p-5">
      <h2 className="text-fg text-base font-semibold">Role Allocation</h2>
      <p className="text-fg-muted mt-1 font-mono text-[10px] tracking-[0.08em] uppercase">
        User distribution per clearance level
      </p>

      {rows.length === 0 ? (
        <p className="text-fg-subtle mt-6 font-mono text-sm">No role data available</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {rows.map((role) => {
            const count = role.user_count ?? 0
            return (
              <li key={role.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {role.name}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold',
                      role.key === 'org_admin' ? 'text-degraded' : 'text-fg',
                    )}
                  >
                    {formatCount(count)}
                  </span>
                </div>
                <div className="bg-surface-3 mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={cn('h-full rounded-full', allocationTone(role))}
                    // Floor at 1% so single-digit roles stay visible rather than
                    // vanishing; a genuinely empty role gets no bar at all.
                    style={{ width: count === 0 ? 0 : `${Math.max((count / peak) * 100, 1)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
