import { useEffect, useState } from 'react'
import { Check, Clock, Copy, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { copyText } from '@/lib/clipboard'
import { formatCountdown } from '@/lib/format'
import { notify } from '@/lib/notify'
import type { RevealedCredential } from '@/lib/api/credentials'

interface CredentialSecretModalProps {
  open: boolean
  /** True while the secret is still being fetched and decrypted. */
  loading: boolean
  /** The decrypted details, once available. */
  details: RevealedCredential | null
  /** Name to show in the header while the fetch is in flight. */
  credentialName?: string
  /**
   * Epoch ms when the access window closes. Omit (or null) for access with no
   * time limit — auto-access and the admin view. When set, the dialog counts down
   * and refuses to copy once it reaches zero.
   */
  expiresAt?: number | null
  onClose: () => void
}

/**
 * Reveal dialog for a credential secret. The plaintext is *never shown* — it can
 * only be copied to the clipboard — so it exists on screen at no point and in
 * memory (the parent's `details`) only while the dialog is open.
 *
 * When `expiresAt` is set the copy is time-boxed: a live countdown warns the user,
 * and once the window closes the copy is disabled so a stale secret can't leave
 * the dialog after access has lapsed.
 */
export function CredentialSecretModal({
  open,
  loading,
  details,
  credentialName,
  expiresAt,
  onClose,
}: CredentialSecretModalProps) {
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const hasTimer = typeof expiresAt === 'number'
  const remaining = hasTimer ? Math.max(0, expiresAt - now) : Infinity
  const expired = remaining <= 0
  const canCopy = Boolean(details) && !expired

  // A live clock, but only while it can change anything — an open, time-boxed dialog.
  useEffect(() => {
    if (!open || !hasTimer) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open, hasTimer])

  // Never carry a stale "copied" tick into the next opening.
  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const copy = async () => {
    if (!canCopy || !details) return
    const ok = await copyText(details.secret)
    if (!ok) {
      notify.error('The secret could not be copied to your clipboard.')
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credential Secret"
      subtitle={details?.name || credentialName || 'Copy the password securely'}
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full">
          <KeyRound className="size-5" />
        </span>
      }
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      {loading || !details ? (
        <div className="text-fg-muted flex items-center justify-center gap-2.5 py-12 font-mono text-sm">
          <Loader2 className="size-4 animate-spin" />
          Decrypting secret…
        </div>
      ) : (
        <div className="space-y-5">
          {hasTimer && <ExpiryBanner remaining={remaining} expired={expired} />}

          <div className="border-line bg-surface-2 grid grid-cols-2 gap-x-3 gap-y-3.5 rounded-lg border p-3.5">
            <Detail label="Name" value={details.name} />
            <Detail label="Username" value={details.username} />
            <Detail label="URL" value={details.url} full />
            {details.notes && <Detail label="Notes" value={details.notes} full />}
          </div>

          {/* Copy-only: the value is masked and never rendered, so it cannot be
              read off the screen, screenshotted or shoulder-surfed. */}
          <div>
            <p className="text-fg-muted mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
              Password
            </p>
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                expired ? 'border-line bg-surface-2 opacity-70' : 'border-primary/25 bg-primary/5',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg',
                  expired ? 'bg-surface-3 text-fg-subtle' : 'bg-primary/15 text-primary-bright',
                )}
              >
                <Lock className="size-4" />
              </span>
              <span className="text-fg-subtle min-w-0 flex-1 truncate font-mono text-lg leading-none tracking-widest select-none">
                ••••••••••••
              </span>
              <Button
                onClick={copy}
                disabled={!canCopy}
                className="shrink-0 py-2 text-xs"
                aria-label="Copy password to clipboard"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy Password'}
              </Button>
            </div>
            <p className="text-fg-subtle mt-2 text-xs">
              The password is never displayed — it is copied straight to your clipboard.
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Countdown / lapsed banner shown when the access is time-boxed. */
function ExpiryBanner({ remaining, expired }: { remaining: number; expired: boolean }) {
  if (expired) {
    return (
      <div className="border-critical/40 bg-critical/10 flex items-start gap-2.5 rounded-lg border p-3">
        <Lock className="text-critical-bright mt-0.5 size-4 shrink-0" />
        <p className="text-fg-muted text-xs leading-relaxed">
          <span className="text-critical-bright font-semibold">This access window has closed.</span>{' '}
          The password can no longer be copied — submit a new request if you still need access.
        </p>
      </div>
    )
  }
  return (
    <div className="border-primary/25 bg-primary/5 flex items-center gap-3 rounded-lg border p-3">
      <ShieldCheck className="text-primary-bright size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-fg-muted text-xs leading-relaxed">
          Temporary access — you won&rsquo;t be able to copy the password once the window closes.
        </p>
      </div>
      <span className="border-primary/25 bg-primary/10 text-primary-bright inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold">
        <Clock className="size-3.5" />
        {formatCountdown(remaining)}
      </span>
    </div>
  )
}

function Detail({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={cn('min-w-0', full && 'col-span-2')}>
      <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">{label}</p>
      <p className="text-fg truncate font-mono text-xs" title={value}>
        {value || '—'}
      </p>
    </div>
  )
}
