import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { cn, stripLeadingWhitespace } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { useSubmitRequest } from '@/hooks/useRequests'
import {
  ON_BEHALF_CATEGORY,
  emptyAccessRequestDraft,
  hasRequestErrors,
  reasonCategoryOptions,
  requestLimits,
  validateAccessRequest,
} from '@/lib/api/requests'
import type { AccessRequestDraft, AccessRequestErrors, ReasonCategory } from '@/lib/api/requests'
import type { Credential, RequestOutcome } from '@/lib/api/types'

interface RequestAccessModalProps {
  credential: Credential | null
  onClose: () => void
  /** Fired with the service's answer — already granted, or queued for approval. */
  onSubmitted: (outcome: RequestOutcome, credential: Credential) => void
}

/** Submit form for a temporary elevation request against a single credential. */
export function RequestAccessModal({ credential, onClose, onSubmitted }: RequestAccessModalProps) {
  const [draft, setDraft] = useState<AccessRequestDraft>(emptyAccessRequestDraft())
  const [submitted, setSubmitted] = useState(false)

  const mutation = useSubmitRequest({
    onSuccess: (outcome) => {
      if (credential) onSubmitted(outcome, credential)
      onClose()
    },
  })
  const { reset: resetMutation } = mutation

  // Re-key the draft whenever a different credential is picked, so a justification
  // typed for one credential never rides along to the next.
  const credentialId = credential?.id ?? ''
  useEffect(() => {
    setDraft(emptyAccessRequestDraft(credentialId))
    setSubmitted(false)
    resetMutation()
  }, [credentialId, resetMutation])

  if (!credential) return null

  const errors = validateAccessRequest(draft)
  const shown: AccessRequestErrors = submitted ? errors : {}
  const busy = mutation.isPending
  const needsBeneficiary = draft.reasonCategory === ON_BEHALF_CATEGORY

  const submit = () => {
    setSubmitted(true)
    if (hasRequestErrors(errors) || busy) return
    mutation.mutate(draft)
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Request Access"
      subtitle="Submit request for temporary elevation"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full">
          <KeyRound className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            CANCEL
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'Submitting…' : 'Submit Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Target Credential">
          <div className="border-line bg-input flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="text-primary-bright truncate font-mono text-sm">
              {credential.name}
            </span>
            <span className="text-fg-muted shrink-0 font-mono text-xs">
              {formatDuration(credential.elevation_duration_seconds)}
            </span>
          </div>
          <p className="text-fg-subtle mt-1.5 text-xs">
            {(credential.has_auto_access ?? credential.auto_grant)
              ? 'This credential auto-grants — access opens as soon as you submit.'
              : 'This credential requires an administrator to approve your request.'}
          </p>
        </Field>

        <Field label="Reason Category" htmlFor="request-reason">
          <Select
            id="request-reason"
            value={draft.reasonCategory}
            onChange={(value) =>
              setDraft((d) => ({ ...d, reasonCategory: value as ReasonCategory }))
            }
            disabled={busy}
          >
            {reasonCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        {/*
          The service identifies a beneficiary by email only — there is no
          directory lookup on this API — so the address is the whole block.
        */}
        {needsBeneficiary && (
          <div className="border-primary/40 bg-primary/5 rounded-lg border p-3">
            <p className="text-primary-bright mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
              Beneficiary
            </p>
            <label htmlFor="request-beneficiary" className="text-fg-muted mb-1.5 block text-xs">
              Email <span className="text-critical-bright">*</span>
            </label>
            <div className="relative">
              <Mail className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="request-beneficiary"
                type="email"
                value={draft.beneficiaryEmail}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, beneficiaryEmail: stripLeadingWhitespace(e.target.value) }))
                }
                placeholder="j.smith@ourworldenergy.com"
                disabled={busy}
                className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-3 pl-9 font-mono text-sm transition-colors outline-none focus:ring-2"
              />
            </div>
            <FieldError message={shown.beneficiaryEmail} />
            <p className="text-fg-muted mt-2 text-xs">
              Access will be provisioned directly to this user.
            </p>
          </div>
        )}

        <Field label="Justification" htmlFor="request-justification">
          <textarea
            id="request-justification"
            value={draft.justification}
            onChange={(e) =>
              setDraft((d) => ({ ...d, justification: stripLeadingWhitespace(e.target.value) }))
            }
            rows={4}
            maxLength={requestLimits.justificationMaxLength}
            placeholder="Describe why this elevation is needed, and reference any change ticket…"
            disabled={busy}
            className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 w-full resize-none rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus:ring-2"
          />
          <FieldError message={shown.justification} />
        </Field>
      </div>
    </Modal>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-fg-muted mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className={cn('text-critical-bright mt-1.5 font-mono text-xs')}>{message}</p>
}
