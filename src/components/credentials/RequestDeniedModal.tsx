import { AlertCircle, Info, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Credential } from '@/lib/credentials-data'

interface RequestDeniedModalProps {
  credential: Credential
  onClose: () => void
  onContactAdmin: () => void
}

/** Failure dialog shown when a request fails policy/security validation. */
export function RequestDeniedModal({
  credential,
  onClose,
  onContactAdmin,
}: RequestDeniedModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Request Denied"
      subtitle="Access elevation failed security validation"
      icon={
        <span className="bg-critical/15 text-critical-bright grid size-9 shrink-0 place-items-center rounded-full">
          <XCircle className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onContactAdmin}>
            Contact Admin
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-fg-muted mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
            Target Credential
          </p>
          <div className="border-line bg-input rounded-lg border px-3 py-2.5">
            <span className="text-primary-bright font-mono text-sm">{credential.keyName}</span>
          </div>
        </div>

        <div>
          <p className="text-fg-muted mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
            Denial Reason
          </p>
          <div className="border-critical/30 bg-critical/5 flex items-start gap-2.5 rounded-lg border p-3">
            <AlertCircle className="text-critical-bright mt-0.5 size-4 shrink-0" />
            <p className="text-fg text-sm leading-relaxed">
              Insufficient justification for production elevation. Please specify the ticket number
              (e.g., JIRA-XXXX) associated with this change request and attach the peer-review
              approval log.
            </p>
          </div>
        </div>

        <div className="border-line bg-surface-2 flex items-start gap-2.5 rounded-lg border p-3">
          <Info className="text-primary-bright mt-0.5 size-4 shrink-0" />
          <p className="text-fg-muted text-xs leading-relaxed">
            You may resubmit a new request with updated details or contact your manager for
            clearance.
          </p>
        </div>
      </div>
    </Modal>
  )
}
