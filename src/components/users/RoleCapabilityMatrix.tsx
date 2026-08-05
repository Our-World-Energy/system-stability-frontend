import { cn } from '@/lib/utils'
import { byRankDescending, rotationLabel, rotationTone, scopeLabel } from '@/lib/role-display'
import type { Role } from '@/lib/api/user-management.types'
import { RolePill } from './RolePill'

const columns = ['Role', 'Credential Access', 'Scoped By', 'Rotation Rights']

/**
 * The access process per role, in one place — the reference behind every scoping
 * decision the add/edit dialogs make.
 *
 * Every cell comes from get-metadata: the description the backend stores against
 * the role, its `scope_type`, and the two rotation booleans. So the policy this
 * card describes and the policy the API enforces cannot drift apart.
 */
export function RoleCapabilityMatrix({ roles }: { roles: Role[] }) {
  if (!roles.length) return null

  return (
    <section className="border-line bg-surface overflow-hidden rounded-lg border">
      <header className="border-line border-b px-5 py-4">
        <h2 className="text-fg text-sm font-semibold">Role Access Matrix</h2>
        <p className="text-fg-muted mt-1 font-mono text-[10px] tracking-[0.08em] uppercase">
          Credential reach and rotation rights per clearance level
        </p>
      </header>

      <div className="overflow-x-auto">
        <table
          aria-label="Role Access Matrix"
          className="w-full min-w-[820px] border-collapse text-sm"
        >
          <thead>
            <tr className="border-line border-b">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-fg-subtle px-5 py-3 text-left font-mono text-[11px] font-semibold tracking-[0.08em] uppercase"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byRankDescending(roles).map((role) => (
              <tr
                key={role.key}
                className="border-line hover:bg-surface-2 border-b align-top transition-colors last:border-0"
              >
                <td className="px-5 py-4">
                  <RolePill role={role} />
                </td>
                <td className="px-5 py-4">
                  <p className="text-fg-muted max-w-[46ch] text-[13px] leading-relaxed">
                    {role.description}
                  </p>
                </td>
                <td className="text-fg-muted px-5 py-4 whitespace-nowrap">
                  {scopeLabel(String(role.scope_type))}
                </td>
                <td
                  className={cn(
                    'px-5 py-4 font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
                    rotationTone(role),
                  )}
                >
                  {rotationLabel(role)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
