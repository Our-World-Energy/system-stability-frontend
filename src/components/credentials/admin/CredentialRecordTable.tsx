import { useState } from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, formatTimestamp } from '@/lib/format'
import { copyText } from '@/lib/clipboard'
import { useRevealSecret } from '@/hooks/useCredentials'
import { notify } from '@/lib/notify'
import type { Credential } from '@/lib/api/types'
import { RowActions, type RecordAction } from './RowActions'

interface CredentialRecordTableProps {
  records: Credential[]
  onAction: (action: RecordAction, record: Credential) => void
  /** True while a search is in flight, so the empty state does not flash. */
  loading?: boolean
  /** Set when the search itself failed. */
  error?: string | null
}

const columns = ['Name & Tags', 'Status', 'Owner', 'Elevation', 'Last Rotated', 'Secret', 'Actions']

/** Admin record list with per-row rotate/purge actions. */
export function CredentialRecordTable({
  records,
  onAction,
  loading,
  error,
}: CredentialRecordTableProps) {
  if (error) return <Placeholder tone="error">{error}</Placeholder>
  if (loading && records.length === 0) return <Placeholder>Searching credentials…</Placeholder>
  if (records.length === 0) return <Placeholder>No credentials match this search</Placeholder>

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
                    {record.tags?.map((tag) => (
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
                <td className="text-fg-muted px-4 py-3.5 font-mono">{record.username || '—'}</td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">
                  {formatDuration(record.elevation_duration_seconds)}
                </td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">
                  {record.last_rotated_at
                    ? formatTimestamp(record.last_rotated_at)
                    : 'Never rotated'}
                </td>
                <td className="px-4 py-3.5">
                  <SecretCell record={record} />
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

/**
 * Masked secret with a copy action.
 *
 * The value is never rendered — clicking fetches the stored envelope, decrypts
 * it in the browser and puts the plaintext straight on the clipboard, so it
 * exists on screen at no point and in memory only for the length of the copy.
 *
 * This relies on the `get-credential-secret` route returning `encrypted_secret`
 * (see `endpoints.credentialManager.secret`) and on the RSA private key being
 * present to decrypt it; either gap fails the click with a plain sentence.
 */
function SecretCell({ record }: { record: Credential }) {
  const [copied, setCopied] = useState(false)
  const reveal = useRevealSecret()
  const { reset } = reveal

  const copy = () => {
    if (reveal.isPending) return
    reveal.mutate(record.id, {
      onSuccess: async (plaintext) => {
        const ok = await copyText(plaintext)
        // Drop the plaintext from the mutation's state now it has been used.
        reset()
        if (!ok) {
          notify.error('The secret could not be copied to your clipboard.')
          return
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span
        title="Stored encrypted. Copy to decrypt it locally."
        className="text-fg-subtle font-mono text-xs tracking-widest"
      >
        ••••••••••••••••
      </span>
      <button
        onClick={copy}
        disabled={reveal.isPending}
        aria-label={`Copy secret for ${record.name}`}
        title="Copy secret to clipboard"
        className={cn(
          'hover:bg-surface-3 grid size-7 shrink-0 place-items-center rounded-md transition-colors disabled:cursor-not-allowed',
          copied ? 'text-healthy' : 'text-fg-subtle hover:text-fg',
        )}
      >
        {reveal.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copied ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  )
}

function Placeholder({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div className="border-line bg-surface grid place-items-center rounded-lg border py-16 text-center">
      <p
        className={cn(
          'font-mono text-sm',
          tone === 'error' ? 'text-critical-bright' : 'text-fg-muted',
        )}
      >
        {children}
      </p>
    </div>
  )
}
