import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Credential } from '@/lib/credentials-data'

interface RequestApprovedModalProps {
  credential: Credential
  onClose: () => void
}

/** Initial elevation window in seconds (1 hour), counted down live. */
const WINDOW_SECONDS = 59 * 60 + 59

function formatWindow(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Success dialog shown when an elevation is granted; exposes a masked temp key. */
export function RequestApprovedModal({ credential, onClose }: RequestApprovedModalProps) {
  const [remaining, setRemaining] = useState(WINDOW_SECONDS)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const minutesLeft = Math.ceil(remaining / 60)

  const handleCopy = () => {
    // Placeholder secret — the real key will come from the provisioning API.
    void navigator.clipboard?.writeText(`sk_tmp_${credential.keyName.toLowerCase()}_redacted`)
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
                <p className="text-fg font-mono text-sm font-semibold">{formatWindow(remaining)}</p>
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

        <Button onClick={handleCopy} className="w-full py-2.5">
          <Copy className="size-4" />
          {copied ? 'Copied to Clipboard' : 'Copy to Clipboard'}
        </Button>

        <div className="border-critical/30 bg-critical/5 flex items-start gap-2 rounded-lg border p-3">
          <Lock className="text-critical-bright mt-0.5 size-4 shrink-0" />
          <p className="text-fg-muted text-xs leading-relaxed">
            Access expires in <span className="text-fg font-semibold">{minutesLeft} minutes</span>.
            For security, keys are never displayed in plain text within this dashboard. Use the copy
            button to secure your credential.
          </p>
        </div>
      </div>
    </Modal>
  )
}
