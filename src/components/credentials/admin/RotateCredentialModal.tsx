import { useState } from 'react'
import { ChevronDown, Loader2, RotateCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { cn, stripLeadingWhitespace } from '@/lib/utils'
import { formatTimestamp } from '@/lib/format'
import { useRotateCredential } from '@/hooks/useCredentials'
import { useIsOrgAdmin } from '@/store/auth'
import { isEncryptionConfigured } from '@/lib/crypto/keys'
import {
  credentialLimits,
  emptyRotateDraft,
  hasRotateErrors,
  twoFactorOptions,
  validateRotateDraft,
} from '@/lib/api/credentials'
import type { RotateCredentialDraft, RotateErrors, TwoFactorType } from '@/lib/api/credentials'
import type { Credential } from '@/lib/api/types'
import { SecretInput } from './SecretInput'

interface RotateCredentialModalProps {
  record: Credential
  onClose: () => void
  /** Fired with the updated record once the service accepts the rotation. */
  onRotated?: (credential: Credential) => void
}

/**
 * Replace a record's secret. Organizational admins may optionally amend metadata
 * at the same time; every other authorized rotator submits the secret only.
 *
 * Everything in the metadata section is an *amendment*: left blank, the field is
 * omitted from the payload and the stored value survives. That is the opposite
 * of the create form, and it is why nothing here is pre-filled — a pre-filled
 * box that someone clears would read as "set this to empty".
 */
export function RotateCredentialModal({ record, onClose, onRotated }: RotateCredentialModalProps) {
  const [draft, setDraft] = useState<RotateCredentialDraft>(() => emptyRotateDraft(record.id))
  const [submitted, setSubmitted] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const canUpdateMetadata = useIsOrgAdmin()

  const mutation = useRotateCredential({
    onSuccess: (credential) => {
      onRotated?.(credential)
      onClose()
    },
  })

  // Keep the request secret-only for non-org-admin roles even if this component
  // retained metadata state while the signed-in role changed underneath it.
  const submissionDraft = canUpdateMetadata
    ? draft
    : {
        ...emptyRotateDraft(record.id),
        secret: draft.secret,
        confirmSecret: draft.confirmSecret,
      }
  const errors = validateRotateDraft(submissionDraft)
  const shown: RotateErrors = submitted ? errors : {}
  const encryptionReady = isEncryptionConfigured()
  const busy = mutation.isPending

  const set = <K extends keyof RotateCredentialDraft>(key: K, value: RotateCredentialDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = () => {
    setSubmitted(true)
    if (hasRotateErrors(errors) || busy || !encryptionReady) return
    mutation.mutate(submissionDraft)
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Rotate Credential"
      className="max-w-2xl"
      subtitle={`${record.name} • Last rotated: ${
        record.last_rotated_at ? formatTimestamp(record.last_rotated_at) : 'never'
      }`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !encryptionReady}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
            {busy ? 'Encrypting & Rotating…' : 'Rotate Credential'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!encryptionReady && (
          <div
            role="alert"
            className="border-degraded/40 bg-degraded/10 text-degraded rounded-lg border px-3 py-2.5 text-sm"
          >
            No encryption key is configured, so a new secret cannot be protected before sending.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="New Secret / Password" htmlFor="rotate-secret">
            <SecretInput
              id="rotate-secret"
              value={draft.secret}
              onChange={(v) => set('secret', v)}
              placeholder="••••••••••••••••"
              disabled={busy}
            />
            <FieldError message={shown.secret} />
          </Field>
          <Field label="Confirm New Secret" htmlFor="rotate-confirm">
            <SecretInput
              id="rotate-confirm"
              value={draft.confirmSecret}
              onChange={(v) => set('confirmSecret', v)}
              placeholder="••••••••••••••••"
              disabled={busy}
            />
            <FieldError message={shown.confirmSecret} />
          </Field>
        </div>

        {canUpdateMetadata && (
          <div>
            <button
              type="button"
              onClick={() => setShowMeta((v) => !v)}
              className="text-fg-muted hover:text-fg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ChevronDown
                className={cn('size-4 transition-transform', showMeta && 'rotate-180')}
              />
              Update other details (metadata)
            </button>

            {showMeta && (
              <div className="border-line bg-surface-2 mt-3 space-y-5 rounded-lg border p-4">
                <p className="text-fg-subtle text-xs">
                  Leave a field blank to keep its current value.
                </p>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Username" htmlFor="rotate-username">
                    <input
                      id="rotate-username"
                      value={draft.username}
                      onChange={(e) => set('username', stripLeadingWhitespace(e.target.value))}
                      placeholder={record.username || 'Unchanged'}
                      autoComplete="off"
                      maxLength={credentialLimits.usernameMaxLength}
                      disabled={busy}
                      className={cn(controlClass, 'h-11 font-mono')}
                    />
                  </Field>
                  <Field label="URL" htmlFor="rotate-url">
                    <input
                      id="rotate-url"
                      value={draft.url}
                      onChange={(e) => set('url', stripLeadingWhitespace(e.target.value))}
                      placeholder={record.url || 'Unchanged'}
                      inputMode="url"
                      disabled={busy}
                      className={cn(controlClass, 'h-11 font-mono')}
                    />
                    <FieldError message={shown.url} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="2FA Type" htmlFor="rotate-2fa">
                    <Select
                      id="rotate-2fa"
                      value={draft.twoFactorType}
                      onChange={(value) => set('twoFactorType', value as TwoFactorType)}
                      disabled={busy}
                    >
                      <option value="unchanged">Leave unchanged</option>
                      {twoFactorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="2FA Approver" htmlFor="rotate-approver">
                    <input
                      id="rotate-approver"
                      type="email"
                      value={draft.twoFactorApprover}
                      onChange={(e) =>
                        set('twoFactorApprover', stripLeadingWhitespace(e.target.value))
                      }
                      placeholder={
                        draft.twoFactorType === 'unchanged'
                          ? 'Unchanged'
                          : 'e.g. raj@ourworldenergy.com'
                      }
                      disabled={
                        busy ||
                        draft.twoFactorType === 'unchanged' ||
                        draft.twoFactorType === 'none'
                      }
                      className={cn(
                        controlClass,
                        'h-11 disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    />
                    <FieldError message={shown.twoFactorApprover} />
                  </Field>
                </div>

                <Field label="Notes" htmlFor="rotate-notes">
                  <textarea
                    id="rotate-notes"
                    value={draft.notes}
                    onChange={(e) => set('notes', stripLeadingWhitespace(e.target.value))}
                    rows={3}
                    maxLength={credentialLimits.notesMaxLength}
                    placeholder="e.g. Rotated after incident INC-4471"
                    disabled={busy}
                    className={cn(controlClass, 'resize-none py-2.5')}
                  />
                  <FieldError message={shown.notes} />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-critical-bright mt-1.5 font-mono text-xs">{message}</p>
}
