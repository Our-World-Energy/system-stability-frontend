import { useEffect, useState } from 'react'
import { KeyRound, Loader2, RotateCw, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { useRequestRotation } from '@/hooks/useCredentials'
import { isEncryptionConfigured } from '@/lib/crypto/keys'
import {
  emptyRotationRequestDraft,
  hasRotationRequestErrors,
  validateRotationRequest,
} from '@/lib/api/credentials'
import type { RotationRequestDraft, RotationRequestErrors } from '@/lib/api/credentials'
import type { Credential } from '@/lib/api/types'
import { SecretInput } from './admin/SecretInput'

interface RequestRotationModalProps {
  record: Credential
  onClose: () => void
}

/**
 * "Request Rotation" form for roles that may propose a rotation but not perform
 * one (Executive on the admin console, Management on the requester view).
 *
 * The requester supplies the new secret — typed twice, as it is irreversible once
 * an admin applies it — and a justification. The value is encrypted in the browser
 * before the request leaves (see `requestCredentialRotation`); nothing here holds
 * the plaintext beyond this component's own state, dropped when the target changes
 * or the dialog closes.
 */
export function RequestRotationModal({ record, onClose }: RequestRotationModalProps) {
  const [draft, setDraft] = useState<RotationRequestDraft>(() =>
    emptyRotationRequestDraft(record.id),
  )
  const [submitted, setSubmitted] = useState(false)

  const mutation = useRequestRotation({ onSuccess: onClose })
  const { reset: resetMutation } = mutation

  // Re-key the draft (and drop the typed secret) whenever the target changes.
  useEffect(() => {
    setDraft(emptyRotationRequestDraft(record.id))
    setSubmitted(false)
    resetMutation()
  }, [record.id, resetMutation])

  const errors = validateRotationRequest(draft)
  const shown: RotationRequestErrors = submitted ? errors : {}
  const encryptionReady = isEncryptionConfigured()
  const busy = mutation.isPending

  const set = <K extends keyof RotationRequestDraft>(key: K, value: RotationRequestDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = () => {
    setSubmitted(true)
    if (hasRotationRequestErrors(errors) || busy || !encryptionReady) return
    mutation.mutate(draft)
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Request Rotation"
      subtitle="Propose a new secret for an administrator to apply"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full">
          <RotateCw className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !encryptionReady}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {busy ? 'Encrypting & Submitting…' : 'Submit Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!encryptionReady && (
          <Banner>
            No encryption key is configured, so the new secret cannot be protected before sending.
            Run <code className="font-mono">node scripts/gen-credential-keys.mjs</code> and add the
            printed lines to your <code className="font-mono">.env</code>.
          </Banner>
        )}

        <Field label="Target Credential">
          <div className="border-line bg-input flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="text-primary-bright truncate font-mono text-sm">{record.name}</span>
            <span className="text-fg-muted shrink-0 font-mono text-xs">
              {formatDuration(record.elevation_duration_seconds)}
            </span>
          </div>
        </Field>

        <Field label="New Secret / Password" htmlFor="rotate-request-secret">
          <SecretInput
            id="rotate-request-secret"
            value={draft.secret}
            onChange={(v) => set('secret', v)}
            placeholder="••••••••••••••••"
            disabled={busy}
          />
          <FieldError message={shown.secret} />
        </Field>

        <Field label="Confirm New Secret" htmlFor="rotate-request-confirm">
          <SecretInput
            id="rotate-request-confirm"
            value={draft.confirmSecret}
            onChange={(v) => set('confirmSecret', v)}
            placeholder="••••••••••••••••"
            disabled={busy}
          />
          <FieldError message={shown.confirmSecret} />
        </Field>

        <Field label="Justification" htmlFor="rotate-request-justification">
          <textarea
            id="rotate-request-justification"
            value={draft.justification}
            onChange={(e) => set('justification', e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Describe why this rotation is needed…"
            disabled={busy}
            className={cn(controlClass, 'resize-none py-2.5')}
          />
          <FieldError message={shown.justification} />
        </Field>
      </div>
    </Modal>
  )
}

/** Inline validation message. Renders nothing when the field is fine. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-critical-bright mt-1.5 font-mono text-xs">{message}</p>
}

/** Standing warning above the form, shown while it cannot be submitted. */
function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="border-degraded/40 bg-degraded/10 text-degraded flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0">{children}</p>
    </div>
  )
}
