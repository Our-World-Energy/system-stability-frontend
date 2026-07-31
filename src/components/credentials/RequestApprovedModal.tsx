import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { demoSecret, formatCountdown, type Credential } from '@/lib/credentials-data'

interface RequestApprovedModalProps {
  credential: Credential
  /** Epoch ms when the elevation window closes; copy is blocked once passed. */
  expiresAt: number
  onClose: () => void
}

/** Success dialog for a granted elevation; exposes a copyable temp key until expiry. */
export function RequestApprovedModal({
  credential,
  expiresAt,
  onClose,
}: RequestApprovedModalProps) {
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, expiresAt - now)
  const expired = remaining <= 0
  const minutesLeft = Math.ceil(remaining / 60000)

  const handleCopy = () => {
    if (expired) return
    void navigator.clipboard?.writeText(demoSecret(credential.keyName))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Request Approved"
      subtitle="Temporary elevation granted successfully."
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full">
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
              <span className="text-primary-bright font-mono text-sm">{credential.keyName}</span>
              <div className="text-right">
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
            <p className="text-fg-muted mt-1 text-xs">Namespace: {credential.namespace}</p>
          </div>
        </div>

        <div>
          <p className="text-fg-muted mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
            Temporary Access Key
          </p>
          <div className="border-line bg-input flex items-center gap-2 rounded-lg border px-3 py-2.5">
            <span className="text-fg-subtle flex-1 font-mono tracking-widest">
              ••••••••••••••••••••
            </span>
            <Lock className="text-fg-subtle size-4 shrink-0" />
          </div>
        </div>

        <Button onClick={handleCopy} disabled={expired} className="w-full py-2.5">
          <Copy className="size-4" />
          {expired ? 'Access Expired' : copied ? 'Copied to Clipboard' : 'Copy to Clipboard'}
        </Button>

        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border p-3',
            expired ? 'border-critical/40 bg-critical/10' : 'border-critical/30 bg-critical/5',
          )}
        >
          <Lock className="text-critical-bright mt-0.5 size-4 shrink-0" />
          <p className="text-fg-muted text-xs leading-relaxed">
            {expired ? (
              'This access window has closed — the key can no longer be copied. Submit a new request if you still need access.'
            ) : (
              <>
                Access expires in{' '}
                <span className="text-fg font-semibold">{minutesLeft} minutes</span>. For security,
                keys are never displayed in plain text within this dashboard. Use the copy button to
                secure your credential.
              </>
            )}
          </p>
        </div>
      </div>
    </Modal>
  )
}
