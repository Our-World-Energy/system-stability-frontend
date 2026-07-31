import { useState } from 'react'
import { ChevronDown, Copy, KeyRound, Mail, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { reasonCategories, type Credential, type ReasonCategory } from '@/lib/credentials-data'

export interface AccessRequestDraft {
  credential: Credential
  reason: ReasonCategory
  /** Required when requesting on behalf of another user. */
  beneficiaryName: string
  /** Optional contact email for the beneficiary. */
  beneficiaryEmail: string
  justification: string
}

interface RequestAccessModalProps {
  credential: Credential | null
  onClose: () => void
  onSubmit: (draft: AccessRequestDraft) => void
}

/** Submit form for a temporary elevation request against a single credential. */
export function RequestAccessModal({ credential, onClose, onSubmit }: RequestAccessModalProps) {
  const [reason, setReason] = useState<ReasonCategory>('On behalf of another user')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [beneficiaryEmail, setBeneficiaryEmail] = useState('')
  const [justification, setJustification] = useState('')

  if (!credential) return null

  const needsBeneficiary = reason === 'On behalf of another user'
  // Name is mandatory when acting for someone else; email is always optional.
  const canSubmit =
    justification.trim().length > 0 && (!needsBeneficiary || beneficiaryName.trim().length > 0)

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ credential, reason, beneficiaryName, beneficiaryEmail, justification })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Request Access"
      subtitle="Submit request for temporary elevation"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full">
          <KeyRound className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            CANCEL
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Submit Request
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Target Credential">
          <div className="border-line bg-input flex items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="text-primary-bright truncate font-mono text-sm">
              {credential.keyName}
            </span>
            <Copy className="text-fg-subtle size-4 shrink-0" />
          </div>
        </Field>

        <Field label="Reason Category">
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReasonCategory)}
              className="border-line bg-input text-fg focus:border-primary focus:ring-primary/20 h-11 w-full appearance-none rounded-lg border px-3 pr-10 text-sm transition-colors outline-none focus:ring-2"
            >
              {reasonCategories.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
          </div>
        </Field>

        {needsBeneficiary && (
          <div className="border-primary/40 bg-primary/5 rounded-lg border p-3">
            <p className="text-primary-bright mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
              Beneficiary
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-fg-muted mb-1.5 block text-xs">
                  Name <span className="text-critical-bright">*</span>
                </label>
                <div className="relative">
                  <User className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <input
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Jordan Smith"
                    className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus:ring-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-fg-muted mb-1.5 block text-xs">Email (optional)</label>
                <div className="relative">
                  <Mail className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <input
                    type="email"
                    value={beneficiaryEmail}
                    onChange={(e) => setBeneficiaryEmail(e.target.value)}
                    placeholder="j.smith@solar.app"
                    className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-3 pl-9 font-mono text-sm transition-colors outline-none focus:ring-2"
                  />
                </div>
              </div>
            </div>
            <p className="text-fg-muted mt-2 text-xs">
              Access will be provisioned directly to this user's workspace.
            </p>
          </div>
        )}

        <Field label="Justification">
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Describe why this elevation is needed, and reference any change ticket…"
            className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 w-full resize-none rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus:ring-2"
          />
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-fg-muted mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </label>
      {children}
    </div>
  )
}
