import { useMemo, useState } from 'react'
import {
  Copy,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  RotateCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimestamp, initialsFrom } from '@/lib/format'
import { credentialAuditEvents, type CredentialAuditAction } from '@/lib/credential-audit-data'

/** Per-action display: label, icon, and the pill palette. */
const actionMeta: Record<CredentialAuditAction, { label: string; icon: LucideIcon; cls: string }> = {
  created: { label: 'Created', icon: Plus, cls: 'text-healthy border-healthy/25 bg-healthy/10' },
  viewed: { label: 'Viewed', icon: Eye, cls: 'text-primary-bright border-primary/25 bg-primary/10' },
  copied: { label: 'Copied', icon: Copy, cls: 'text-degraded border-degraded/30 bg-degraded/10' },
  rotated: {
    label: 'Rotated',
    icon: RotateCw,
    cls: 'text-primary-bright border-primary/25 bg-primary/10',
  },
  updated: { label: 'Updated', icon: Pencil, cls: 'text-fg border-line-bright bg-surface-3' },
  deleted: {
    label: 'Deleted',
    icon: Trash2,
    cls: 'text-critical-bright border-critical/30 bg-critical/10',
  },
  requested: {
    label: 'Requested',
    icon: KeyRound,
    cls: 'text-fg-muted border-line-bright bg-surface-3',
  },
  approved: {
    label: 'Approved',
    icon: ShieldCheck,
    cls: 'text-healthy border-healthy/25 bg-healthy/10',
  },
  denied: { label: 'Denied', icon: ShieldX, cls: 'text-critical-bright border-critical/30 bg-critical/10' },
}

const columns = ['Actor', 'Action', 'Credential', 'Detail', 'Timestamp']

type ActionFilter = CredentialAuditAction | 'all'

/**
 * Org-admin audit trail for the credential manager: who created, viewed, copied,
 * rotated or removed each credential, and every request decision alongside.
 *
 * Reads placeholder data for now (see `credential-audit-data`); the view is ready
 * to point at the live feed the moment it exists.
 */
export function CredentialAuditLog() {
  const [filter, setFilter] = useState<ActionFilter>('all')

  const events = credentialAuditEvents
  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.action === filter)),
    [events, filter],
  )

  // Only offer filters for actions actually present, in a stable order.
  const presentActions = useMemo(() => {
    const order = Object.keys(actionMeta) as CredentialAuditAction[]
    const seen = new Set(events.map((e) => e.action))
    return order.filter((a) => seen.has(a))
  }, [events])

  return (
    <div className="space-y-6">
      <div className="border-degraded/30 bg-degraded/5 text-degraded flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px]">
        <span className="bg-degraded size-1.5 rounded-full" />
        Preview — sample data. The live audit feed will be wired in once its API is available.
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All Events
        </FilterChip>
        {presentActions.map((action) => {
          const { label, icon: Icon } = actionMeta[action]
          return (
            <FilterChip key={action} active={filter === action} onClick={() => setFilter(action)}>
              <Icon className="size-3" />
              {label}
            </FilterChip>
          )
        })}
      </div>

      <section className="border-line bg-surface rounded-lg border">
        <div className="border-line flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-fg text-sm font-semibold">Credential Audit Log</h2>
          <span className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
            {visible.length} {visible.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-line border-b">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-fg-subtle px-4 py-3 text-left font-mono text-[11px] font-semibold tracking-[0.08em] uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => (
                <tr
                  key={event.id}
                  className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-primary/15 text-primary-bright grid size-8 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold">
                        {initialsFrom(event.actor)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-fg truncate font-medium">{event.actor}</p>
                        <p className="text-fg-subtle truncate font-mono text-[10px] tracking-[0.06em] uppercase">
                          {event.actorRole}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ActionPill action={event.action} />
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-fg-muted font-mono">{event.credentialName}</p>
                  </td>
                  <td className="max-w-sm px-4 py-3.5">
                    <p className="text-fg-muted truncate" title={event.detail}>
                      {event.detail}
                    </p>
                    {event.ip && (
                      <p className="text-fg-subtle mt-0.5 font-mono text-[10px]">from {event.ip}</p>
                    )}
                  </td>
                  <td className="text-fg-muted px-4 py-3.5 font-mono whitespace-nowrap">
                    {formatTimestamp(event.at)}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <p className="text-fg-muted font-mono text-sm">No events for this filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ActionPill({ action }: { action: CredentialAuditAction }) {
  const { label, icon: Icon, cls } = actionMeta[action]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-bold tracking-[0.05em] uppercase',
        cls,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary-bright'
          : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
