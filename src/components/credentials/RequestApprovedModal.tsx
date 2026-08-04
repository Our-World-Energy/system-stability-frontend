import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatCountdown, formatDuration, formatTimestamp } from '@/lib/format'
import type { Credential, Grant } from '@/lib/api/types'

interface RequestApprovedModalProps {
  credential: Credential
  grant: Grant
  onClose: () => void
}

/**
 * Confirmation of a live elevation window.
 *
 * There is deliberately no key to copy: no route on the credential manager
 * returns `encrypted_secret`, so what this dialog can honestly show is the grant
 * itself — that access was authorised, and how long it lasts.
 */
export function RequestApprovedModal({ credential, grant, onClose }: RequestApprovedModalProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const expiresAt = new Date(grant.expires_at).getTime()
  const remaining = Math.max(0, expiresAt - now)
  const expired = remaining <= 0
  const minutesLeft = Math.ceil(remaining / 60_000)

  return (
    <Modal
      open
      onClose={onClose}
      title={expired ? 'Access Window Closed' : 'Access Granted'}
      subtitle={
        expired ? 'This elevation has expired.' : 'Temporary elevation granted successfully.'
      }
      icon={
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            expired ? 'bg-critical/15 text-critical-bright' : 'bg-primary/15 text-primary-bright',
          )}
        >
          <CheckCircle2 className="size-5" />
        </span>
      }
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-fg-muted mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
            Credential Details
          </p>
          <div className="border-line bg-input rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-primary-bright truncate font-mono text-sm">{credential.name}</p>
                <p className="text-fg-muted mt-0.5 font-mono text-xs">
                  {credential.username || '—'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
                  Window Expires
                </p>
                <p
                  className={cn(
                    'font-mono text-sm font-semibold',
                    expired ? 'text-critical-bright' : 'text-fg',
                  )}
                >
                  {formatCountdown(remaining)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-line bg-surface-2 grid grid-cols-2 gap-3 rounded-lg border p-3">
          <Detail label="Granted At" value={formatTimestamp(grant.granted_at)} />
          <Detail label="Expires At" value={formatTimestamp(grant.expires_at)} />
          <Detail label="Elevation" value={formatDuration(credential.elevation_duration_seconds)} />
          <Detail label="Grant Status" value={grant.status} />
        </div>

        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border p-3',
            expired ? 'border-critical/40 bg-critical/10' : 'border-line bg-surface-2',
          )}
        >
          {expired ? (
            <Lock className="text-critical-bright mt-0.5 size-4 shrink-0" />
          ) : (
            <ShieldCheck className="text-primary-bright mt-0.5 size-4 shrink-0" />
          )}
          <p className="text-fg-muted text-xs leading-relaxed">
            {expired ? (
              'This access window has closed. Submit a new request if you still need access.'
            ) : (
              <>
                Access expires in{' '}
                <span className="text-fg font-semibold">
                  {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}
                </span>
                . The secret itself is never returned by this dashboard — it is provisioned to you
                through the credential&rsquo;s own system.
              </>
            )}
          </p>
        </div>
      </div>
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">{label}</p>
      <p className="text-fg truncate font-mono text-xs">{value}</p>
    </div>
  )
}
