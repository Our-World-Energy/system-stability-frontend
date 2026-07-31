import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CredentialRecord } from '@/lib/admin-credentials-data'
import { RowActions, type RecordAction } from './RowActions'

interface CredentialRecordTableProps {
  records: CredentialRecord[]
  onAction: (action: RecordAction, record: CredentialRecord) => void
}

const columns = ['Name & Tags', 'Status', 'Owner', 'Elevation', 'Last Rotated', 'Secret', 'Actions']

/** Admin record list with per-row rotate/archive/purge actions. */
export function CredentialRecordTable({ records, onAction }: CredentialRecordTableProps) {
  if (records.length === 0) {
    return (
      <div className="border-line bg-surface grid place-items-center rounded-lg border py-16 text-center">
        <p className="text-fg-muted font-mono text-sm">No records match this filter</p>
      </div>
    )
  }

  return (
    <div className="border-line bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-line border-b">
            {columns.map((col) => (
              <th
                key={col}
                className={cn(
                  'text-fg-subtle px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
                  col === 'Actions' ? 'text-right' : 'text-left',
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const active = record.status === 'active'
            return (
              <tr
                key={record.id}
                className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
              >
                <td className="px-4 py-3.5">
                  <p className="text-fg font-mono font-medium">{record.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {record.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-surface-3 text-fg-muted rounded px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        active ? 'bg-healthy' : 'bg-fg-subtle',
                      )}
                    />
                    <span className={active ? 'text-fg' : 'text-fg-muted'}>
                      {active ? 'Active' : 'Archived'}
                    </span>
                  </span>
                </td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">{record.owner}</td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">{record.elevation}</td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">
                  {record.lastRotated ?? 'Never rotated'}
                </td>
                <td className="px-4 py-3.5">
                  <SecretCell secret={record.secret} />
                </td>
                <td className="px-4 py-3.5">
                  <RowActions record={record} onAction={onAction} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Admin-only secret — masked at all times; copy-to-clipboard without revealing. */
function SecretCell({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard?.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-fg-subtle font-mono text-xs tracking-widest">••••••••••••••••</span>
      <button
        onClick={copy}
        aria-label="Copy secret"
        title="Copy secret"
        className={cn(
          'hover:bg-surface-3 grid size-7 shrink-0 place-items-center rounded-md transition-colors',
          copied ? 'text-healthy' : 'text-fg-subtle hover:text-fg',
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}
