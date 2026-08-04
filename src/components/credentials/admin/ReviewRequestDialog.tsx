import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { formatUserRef, formatWait } from '@/lib/format'
import { useReviewRequest } from '@/hooks/useRequests'
import { requestLimits } from '@/lib/api/requests'
import type { ReviewAction } from '@/lib/api/requests'
import type { PendingRequestItem } from '@/lib/api/types'

interface ReviewRequestDialogProps {
  request: PendingRequestItem
  action: ReviewAction
  onClose: () => void
}

/**
 * Confirm an approve or a deny.
 *
 * Approving issues the grant atomically on the server, so this is the last point
 * at which the decision can be reconsidered. Denying additionally requires a
 * reason, which is stored on the request and shown to the requester.
 */
export function ReviewRequestDialog({ request, action, onClose }: ReviewRequestDialogProps) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useReviewRequest({ onSuccess: onClose })
  const busy = mutation.isPending
  const denying = action === 'deny'
  const reasonMissing = denying && !reason.trim()

  const submit = () => {
    setSubmitted(true)
    if (reasonMissing || busy) return
    mutation.mutate({ requestId: request.id, action, denialReason: reason })
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={denying ? 'Deny request?' : 'Approve request?'}
      icon={
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            denying ? 'bg-critical/15 text-critical-bright' : 'bg-primary/15 text-primary-bright',
          )}
        >
          {denying ? <XCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className={cn(denying && 'bg-critical/80 text-fg hover:bg-critical active:bg-critical')}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'Recording…' : denying ? 'Deny' : 'Approve'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-fg-muted text-sm leading-relaxed">
          You&rsquo;re about to {action}{' '}
          <span className="text-fg font-mono">{formatUserRef(request.requested_by)}</span>
          &rsquo;s request for <span className="text-fg font-mono">{request.credential_name}</span>,
          waiting <span className="text-fg font-mono">{formatWait(request.wait_minutes)}</span>.
        </p>

        <div className="border-line bg-surface-2 rounded-lg border p-3">
          <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
            Justification
          </p>
          <p className="text-fg mt-1 text-sm leading-relaxed">{request.justification}</p>
          {request.beneficiary_email && (
            <p className="text-fg-muted mt-2 font-mono text-xs">
              On behalf of {request.beneficiary_email}
            </p>
          )}
        </div>

        {/* Approving needs no extra input — the grant window comes from the
            credential's own elevation setting. */}
        {denying && (
          <Field label="Denial Reason" htmlFor="denial-reason" required>
            <textarea
              id="denial-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={requestLimits.denialReasonMaxLength}
              placeholder="Explain why this request is being turned down…"
              disabled={busy}
              className={cn(controlClass, 'resize-none py-2.5')}
            />
            {submitted && reasonMissing && (
              <p className="text-critical-bright mt-1.5 font-mono text-xs">
                A reason is required to deny a request.
              </p>
            )}
          </Field>
        )}
      </div>
    </Modal>
  )
}
