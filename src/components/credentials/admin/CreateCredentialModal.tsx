import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, KeyRound, Loader2, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { useCreateCredential } from '@/hooks/useCreateCredential'
import { useUserMetadata } from '@/hooks/useUserManagement'
import { isEncryptionConfigured } from '@/lib/crypto/keys'
import {
  credentialLimits,
  emptyCredentialDraft,
  hasErrors,
  twoFactorOptions,
  validateCredentialDraft,
} from '@/lib/api/credentials'
import type {
  CreatedCredential,
  CredentialDraft,
  CredentialErrors,
  TwoFactorType,
} from '@/lib/api/credentials'
import { SecretInput } from './SecretInput'

/** Sentinel `<option>` value ("Other") that switches the platform control to free text. */
const OTHER_PLATFORM = 'other'

interface CreateCredentialModalProps {
  open: boolean
  onClose: () => void
  /** Fired once the service has accepted the record. */
  onCreated?: (created: CreatedCredential, draft: CredentialDraft) => void
}

/**
 * Form for registering a new credential record with an initial write-only secret.
 *
 * The secret is encrypted in the browser before the request leaves — see
 * `lib/crypto/secret-crypto.ts`. Nothing here ever holds the plaintext beyond the
 * component's own state, which is dropped every time the dialog opens or closes.
 *
 * Platform and department are populated from the same get-metadata catalog the
 * User Management form uses; platform additionally allows a value not yet in the
 * catalog. Both, plus the dev-credential flag, are optional — leaving them alone
 * reproduces the original create exactly.
 *
 * The payload also carries tags, an elevation window and an auto-grant flag; they
 * have no control here and go out at their defaults (see `CredentialDraft`).
 */
export function CreateCredentialModal({ open, onClose, onCreated }: CreateCredentialModalProps) {
  const [draft, setDraft] = useState<CredentialDraft>(emptyCredentialDraft)
  // Errors stay hidden until the first submit, so the form does not scold anyone
  // for fields they have not reached yet.
  const [submitted, setSubmitted] = useState(false)
  // Whether the platform control is in free-text ("add new") mode rather than
  // picking from the catalog. Reset with the draft on every open/close.
  const [platformCustom, setPlatformCustom] = useState(false)

  // Catalog for the platform/department dropdowns. Fetched only while the dialog
  // is open, and allowed to fail quietly: platform still takes a typed value and
  // department simply has no options, so a metadata 403 never blocks a create.
  const metadata = useUserMetadata(open)
  const platforms = metadata.data?.platforms ?? []
  const departments = metadata.data?.departments ?? []

  const mutation = useCreateCredential({
    onSuccess: (result, submittedDraft) => {
      onCreated?.(result.data ?? {}, submittedDraft)
      onClose()
    },
  })

  const { reset: resetMutation } = mutation

  // Drop the draft — the plaintext secret above all — whenever the dialog opens
  // or closes. The component itself is never unmounted by the page.
  useEffect(() => {
    setDraft(emptyCredentialDraft())
    setSubmitted(false)
    setPlatformCustom(false)
    resetMutation()
  }, [open, resetMutation])

  const errors = validateCredentialDraft(draft)
  const shown: CredentialErrors = submitted ? errors : {}
  const encryptionReady = isEncryptionConfigured()
  const busy = mutation.isPending

  // Closing mid-flight would leave a request in the air with no UI attached, so
  // the backdrop, Escape and Cancel all no-op while the create is running.
  const requestClose = useCallback(() => {
    if (!busy) onClose()
  }, [busy, onClose])

  const set = <K extends keyof CredentialDraft>(key: K, value: CredentialDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  // "Other" flips the control to a free-text input and clears any catalog id;
  // picking a catalog platform flips it back and drops any typed name. Exactly
  // one of platformId / platformOther is ever populated.
  const onPlatformSelect = (value: string) => {
    if (value === OTHER_PLATFORM) {
      setPlatformCustom(true)
      setDraft((d) => ({ ...d, platformId: null }))
    } else {
      setPlatformCustom(false)
      setDraft((d) => ({
        ...d,
        platformId: value ? Number(value) : null,
        platformOther: '',
      }))
    }
  }

  const submit = () => {
    setSubmitted(true)
    if (hasErrors(errors) || busy || !encryptionReady) return
    mutation.mutate(draft)
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="Create New Credential"
      subtitle="Enter metadata and initial secret value. The secret will be write-only."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={requestClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !encryptionReady}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {busy ? 'Encrypting & Creating…' : 'Create Credential'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* A failed create is reported by a toast (see useCreateCredential). This
            banner is not an event but a standing condition: the submit button is
            disabled while it shows, so it has to stay on screen to explain why. */}
        {!encryptionReady && (
          <Banner>
            No encryption key is configured, so secrets cannot be protected before sending. Run{' '}
            <code className="font-mono">node scripts/gen-credential-keys.mjs</code> and add the
            printed lines to your <code className="font-mono">.env</code>.
          </Banner>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Credential Name" htmlFor="cred-name">
            <input
              id="cred-name"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Production DB Key"
              maxLength={credentialLimits.nameMaxLength}
              disabled={busy}
              className={cn(controlClass, 'h-11')}
            />
            <FieldError message={shown.name} />
          </Field>
          <Field label="Username" htmlFor="cred-username">
            <input
              id="cred-username"
              value={draft.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="admin_svc_prod"
              autoComplete="off"
              maxLength={credentialLimits.usernameMaxLength}
              disabled={busy}
              className={cn(controlClass, 'h-11 font-mono')}
            />
            <FieldError message={shown.username} />
          </Field>
        </div>

        <Field label="Secret / Password" htmlFor="cred-secret">
          <SecretInput
            id="cred-secret"
            value={draft.secret}
            onChange={(v) => set('secret', v)}
            placeholder="••••••••••••••••"
            disabled={busy}
          />
          <FieldError message={shown.secret} />
        </Field>

        <Field label="URL" htmlFor="cred-url">
          <input
            id="cred-url"
            value={draft.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://db-cluster-01.internal.net"
            inputMode="url"
            disabled={busy}
            className={cn(controlClass, 'h-11 font-mono')}
          />
          <FieldError message={shown.url} />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Platform" htmlFor="cred-platform">
            <SelectControl
              id="cred-platform"
              value={
                platformCustom
                  ? OTHER_PLATFORM
                  : draft.platformId != null
                    ? String(draft.platformId)
                    : ''
              }
              onChange={onPlatformSelect}
              disabled={busy}
            >
              <option value="">
                {metadata.isLoading ? 'Loading platforms…' : 'Select platform…'}
              </option>
              {platforms.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
              <option value={OTHER_PLATFORM}>Other</option>
            </SelectControl>
            {platformCustom && (
              <input
                value={draft.platformOther}
                onChange={(e) => set('platformOther', e.target.value)}
                placeholder="Platform name"
                aria-label="Other platform name"
                maxLength={credentialLimits.nameMaxLength}
                disabled={busy}
                autoFocus
                className={cn(controlClass, 'mt-2 h-11')}
              />
            )}
          </Field>
          <Field label="Department" htmlFor="cred-department">
            <SelectControl
              id="cred-department"
              value={draft.departmentId != null ? String(draft.departmentId) : ''}
              onChange={(v) => set('departmentId', v ? Number(v) : null)}
              disabled={busy}
            >
              <option value="">
                {metadata.isLoading ? 'Loading departments…' : 'No department'}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </SelectControl>
          </Field>
        </div>

        <label
          htmlFor="cred-is-dev"
          className={cn(
            'flex w-fit items-center gap-2.5 text-sm',
            busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <input
            id="cred-is-dev"
            type="checkbox"
            checked={draft.isDev}
            onChange={(e) => set('isDev', e.target.checked)}
            disabled={busy}
            className="accent-primary-bright size-4"
          />
          <span className="text-fg">This is a development credential</span>
        </label>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="2FA Type" htmlFor="cred-2fa">
            <SelectControl
              id="cred-2fa"
              value={draft.twoFactorType}
              onChange={(v) => set('twoFactorType', v as TwoFactorType)}
              disabled={busy}
            >
              {twoFactorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field label="2FA Approver" htmlFor="cred-approver">
            <input
              id="cred-approver"
              type="email"
              value={draft.twoFactorApprover}
              onChange={(e) => set('twoFactorApprover', e.target.value)}
              // The contract stores the approver as an email, not a display name.
              placeholder={
                draft.twoFactorType === 'none' ? 'Not required' : 'e.g. raj@ourworldenergy.com'
              }
              disabled={busy || draft.twoFactorType === 'none'}
              className={cn(controlClass, 'h-11 disabled:cursor-not-allowed disabled:opacity-50')}
            />
            <FieldError message={shown.twoFactorApprover} />
          </Field>
        </div>

        <Field label="Notes" htmlFor="cred-notes">
          <textarea
            id="cred-notes"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            maxLength={credentialLimits.notesMaxLength}
            placeholder="Additional context regarding access rotation policies…"
            disabled={busy}
            className={cn(controlClass, 'resize-none py-2.5')}
          />
          <FieldError message={shown.notes} />
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

/** Standing warning above the form, shown while the form cannot be submitted. */
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

/** Native select styled to match the dark form controls, with a chevron affordance. */
function SelectControl({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, 'h-11 appearance-none pr-10 disabled:cursor-not-allowed')}
      >
        {children}
      </select>
      <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  )
}
