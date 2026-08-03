import { cn } from '@/lib/utils'
import {
  roleCapabilities,
  userRoles,
  type CredentialScope,
  type RotationRight,
} from '@/lib/users-data'
import { RolePill } from './RolePill'

/** What decides a role's reach — the scoping input its provisioning form collects. */
const scopedByText: Record<CredentialScope, string> = {
  all: 'Organization-wide',
  assigned_platforms: 'Assigned platform(s)',
  development: 'Development environment',
  department: 'Department',
}

const rotationTone: Record<RotationRight, string> = {
  rotate: 'text-primary-bright',
  request: 'text-degraded',
  none: 'text-fg-subtle',
}

const columns = ['Role', 'Credential Access', 'Scoped By', 'Rotation Rights']

/**
 * The access process per role, in one place — the reference behind every scoping
 * decision the add/edit dialogs make. Read straight from `roleCapabilities`, so
 * changing the policy there changes this card and the enforced form together.
 */
export function RoleCapabilityMatrix() {
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
            {userRoles.map((role) => {
              const capability = roleCapabilities[role]
              return (
                <tr
                  key={role}
                  className="border-line hover:bg-surface-2 border-b align-top transition-colors last:border-0"
                >
                  <td className="px-5 py-4">
                    <RolePill role={role} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-fg">{capability.accessLabel}</p>
                    <p className="text-fg-muted mt-1 max-w-[38ch] text-[13px] leading-relaxed">
                      {capability.process}
                    </p>
                  </td>
                  <td className="text-fg-muted px-5 py-4 whitespace-nowrap">
                    {scopedByText[capability.scope]}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-4 font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
                      rotationTone[capability.rotation],
                    )}
                  >
                    {capability.rotationLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
