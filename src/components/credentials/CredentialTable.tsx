import { Clock, KeyRound, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatCountdown, formatDuration } from '@/lib/format'
import type { Credential } from '@/lib/api/types'
import { EligibilityBadge } from './EligibilityBadge'

interface CredentialTableProps {
  credentials: Credential[]
  onRequest: (credential: Credential) => void
  /** Reveal the secret for a credential the requester may access. */
  onReveal: (credential: Credential) => void
  /**
   * Rotate a credential's secret directly (Platform / Dev admins). Shown only on
   * rows with automatic access; omitted for roles that cannot rotate.
   */
  onRotate?: (credential: Credential) => void
  /**
   * Propose a new secret for a credential (Management users). Shown only on rows
   * with automatic access; omitted for roles that cannot request a rotation.
   */
  onRequestRotation?: (credential: Credential) => void
  /**
   * Grants opened in this session: credential id → epoch ms the window closes.
   * A fallback for a just-submitted auto-grant the search has not refetched yet;
   * the row's own `grant` (from the API) takes precedence when present.
   */
  grants: Record<string, number>
  /** Current time (epoch ms), ticked once a second by the page. */
  now: number
  loading?: boolean
  error?: string | null
}

/** True when the requester can open the secret: automatic access or a granted request. */
function canReveal(cred: Credential): boolean {
  return cred.has_auto_access === true || cred.request_status === 'granted'
}

const columns = ['Credential', 'Eligibility', 'Description', 'Elevation', 'Action']

/** The credential catalog rendered as a responsive table with per-row request actions. */
export function CredentialTable({
  credentials,
  onRequest,
  onReveal,
  onRotate,
  onRequestRotation,
  grants,
  now,
  loading,
  error,
}: CredentialTableProps) {
  if (error) return <Placeholder tone="error">{error}</Placeholder>
  if (loading && credentials.length === 0) return <Placeholder>Searching credentials…</Placeholder>
  if (credentials.length === 0) return <Placeholder>No credentials match your search</Placeholder>

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
            // The API grant (survives reload) wins over a session grant fallback.
            const grantExpiry =
              cred.request_status === 'granted' && cred.grant
                ? new Date(cred.grant.expires_at).getTime()
                : grants[cred.id]
            const remaining = grantExpiry ? grantExpiry - now : 0
            const timerActive = remaining > 0
            const revealable = canReveal(cred) || timerActive
            const isPending = cred.request_status === 'pending'
            return (
              <tr
                key={cred.id}
                className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
              >
                <td className="px-4 py-3.5">
                  <p className="text-fg font-medium">{cred.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {cred.tags?.map((tag) => (
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
                  <EligibilityBadge autoGrant={cred.has_auto_access ?? cred.auto_grant ?? false} />
                </td>
                <td className="max-w-xs px-4 py-3.5">
                  <p className="text-fg-muted truncate" title={cred.notes}>
                    {cred.notes || '—'}
                  </p>
                </td>
                <td className="text-fg-muted px-4 py-3.5 font-mono">
                  {formatDuration(cred.elevation_duration_seconds)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {/* Platform / Dev admins rotate directly; Management requests a
                        rotation. Both apply only to credentials with automatic
                        access, and are hidden on every other row. */}
                    {onRotate && cred.has_auto_access === true && (
                      <button
                        type="button"
                        onClick={() => onRotate(cred)}
                        aria-label={`Rotate ${cred.name}`}
                        title="Rotate credential"
                        className="text-fg-muted hover:bg-surface-3 hover:text-fg grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
                      >
                        <RotateCw className="size-4" />
                      </button>
                    )}
                    {onRequestRotation && cred.has_auto_access === true && (
                      <button
                        type="button"
                        onClick={() => onRequestRotation(cred)}
                        aria-label={`Request rotation for ${cred.name}`}
                        title="Request rotation"
                        className="text-fg-muted hover:bg-surface-3 hover:text-fg grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
                      >
                        <RotateCw className="size-4" />
                      </button>
                    )}

                    {revealable ? (
                      // Access the requester already has (auto-access or a granted
                      // request): reveal the secret, and count down the window when
                      // the grant carries one.
                      <>
                        {timerActive && (
                          <span className="border-primary/25 bg-primary/10 text-primary-bright inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold">
                            <Clock className="size-3" />
                            {formatCountdown(remaining)}
                          </span>
                        )}
                        <Button onClick={() => onReveal(cred)} className="py-1.5 text-xs">
                          <KeyRound className="size-3.5" />
                          View Password
                        </Button>
                      </>
                    ) : isPending ? (
                      // A request is already in the queue — nothing to do but wait.
                      <span className="border-degraded/30 bg-degraded/10 text-degraded inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold">
                        <Clock className="size-3" />
                        Pending Approval
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => onRequest(cred)}
                        className="py-1.5 text-xs"
                      >
                        Request Access
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
