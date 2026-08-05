import { cn } from '@/lib/utils'
import { roleStyle } from '@/lib/role-display'
import type { Role } from '@/lib/api/user-management.types'

/**
 * The role badge on a registry row.
 *
 * Takes the whole role record: the key picks the tint, the name is what shows —
 * both from get-metadata, so a role renamed in the DB renames here too.
 */
export function RolePill({ role }: { role: Pick<Role, 'key' | 'name'> }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase',
        roleStyle(role.key),
      )}
    >
      {role.name}
    </span>
  )
}
