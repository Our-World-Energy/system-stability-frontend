import { Copy, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatCountdown, type Credential } from '@/lib/credentials-data'
import { EligibilityBadge } from './EligibilityBadge'

interface CredentialTableProps {
  credentials: Credential[]
  onRequest: (credential: Credential) => void
  /** Active grants: credential id → epoch ms the elevation window closes. */
  grants: Record<string, number>
  /** Current time (epoch ms), ticked once a second by the page. */
  now: number
  /** Open the approved dialog to copy the key for an already-granted credential. */
  onViewKey: (credential: Credential) => void
}

const columns = ['Credential', 'Eligibility', 'Description', 'Elevation', 'Action']

/** The credential catalog rendered as a responsive table with per-row request actions. */
export function CredentialTable({
  credentials,
  onRequest,
  grants,
  now,
  onViewKey,
}: CredentialTableProps) {
  if (credentials.length === 0) {
    return (
      <div className="border-line bg-surface grid place-items-center rounded-lg border py-16 text-center">
        <p className="text-fg-muted font-mono text-sm">No credentials match your filters</p>
      </div>
    )
  }

  return (
    <div className="border-line bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-line border-b">
            {columns.map((col) => (
              <th
                key={col}
                className={cn(
                  'text-fg-subtle px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
                  col === 'Action' ? 'text-right' : 'text-left',
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred) => {
            const expiresAt = grants[cred.id]
            const remaining = expiresAt ? expiresAt - now : 0
            const granted = remaining > 0
            return (
              <tr
                key={cred.id}
                className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
              >
                <td className="px-4 py-3.5">
                  <p className="text-fg font-medium">{cred.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {cred.tags.map((tag) => (
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
                  <EligibilityBadge eligibility={cred.eligibility} />
                </td>
                <td className="max-w-xs px-4 py-3.5">
                  <p className="text-fg-muted truncate" title={cred.description}>
                    {cred.description}
                  </p>
                </td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">{cred.elevation}</td>
                <td className="px-4 py-3.5">
                  {granted ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="border-primary/25 bg-primary/10 text-primary-bright inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold">
                        <Clock className="size-3" />
                        {formatCountdown(remaining)}
                      </span>
                      <Button onClick={() => onViewKey(cred)} className="py-1.5 text-xs">
                        <Copy className="size-3.5" />
                        Copy Key
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <Button
                        variant="outline"
                        onClick={() => onRequest(cred)}
                        className="py-1.5 text-xs"
                      >
                        Request Access
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
