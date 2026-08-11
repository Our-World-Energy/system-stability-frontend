import { useRef, useState } from 'react'
import { PasswordInput } from '@/components/auth/AuthInput'
import { AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert, FieldError } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { changePassword } from '@/lib/api/user-management'
import { useAuthStore } from '@/store/auth'

/** Backend rule: at least 8 characters, and different from the current one. */
const MIN_LENGTH = 8

interface ChangePasswordFormProps {
  /**
   * Ran once change-password has succeeded. The forced screen navigates into the
   * app; the account page stays put and says so.
   */
  onSuccess: () => void
  /** Shown above the fields, so it is clear which account is being changed. */
  email?: string | null
  autoFocus?: boolean
  submitLabel?: string
}

/**
 * The change-password fields, their validation and the request behind them.
 *
 * Shared by the forced post-provisioning screen and the account page's Reset
 * Password panel: change-password acts on the caller's own account and is open to
 * every authenticated role, so both entry points want exactly these rules. Keeping
 * one copy is what stops the two drifting into disagreeing about what a valid
 * password is.
 */
export function ChangePasswordForm({
  onSuccess,
  email,
  autoFocus,
  submitLabel = 'Update Password',
}: ChangePasswordFormProps) {
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const currentRef = useRef<HTMLInputElement>(null)

  // Mirrored from the backend's own validation so the button explains itself
  // rather than spending a round trip to say "must be at least 8 characters".
  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const sameAsCurrent = next.length > 0 && next === current
  const mismatch = confirm.length > 0 && confirm !== next
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    next !== current &&
    confirm === next &&
    !pending

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setPending(true)
    setError(null)
    try {
      await changePassword({ current_password: current, new_password: next })
      // The account's must_change_password is now false server-side; mirror that
      // locally so RequireAuth stops funnelling every route back to the forced
      // screen. Harmless when the flag was already false.
      clearMustChangePassword()
      // Nothing typed here is worth keeping once it has been accepted, and the
      // account page leaves this form mounted.
      setCurrent('')
      setNext('')
      setConfirm('')
      setPending(false)
      onSuccess()
    } catch (err) {
      // "current password is incorrect", "new_password must be different from
      // current_password" — all already phrased for a user.
      setError(toApiError(err).message)
      // Clear the credential that was checked and put the cursor back in it, the
      // same as a rejected sign-in. The new password and its confirmation are
      // left alone: they are the user's own choice, still valid, and making them
      // type it twice again to fix a mistyped current password is punishing.
      //
      // Deliberately not keyed off the message text — which field to clear should
      // not depend on backend wording this code also renders verbatim.
      setCurrent('')
      setPending(false)
      currentRef.current?.focus()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

      <div className="space-y-5">
        {/* change-password always acts on the caller's own account, so this is a
            statement of fact rather than a choice. */}
        {email && (
          <p className="text-fg-muted text-[13px]">
            Signed in as <span className="text-primary-bright font-mono">{email}</span>
          </p>
        )}

        <Field label="Current Password" htmlFor="current-password">
          <PasswordInput
            id="current-password"
            ref={currentRef}
            autoComplete="current-password"
            autoFocus={autoFocus}
            placeholder="••••••••••••"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>

        <Field label="New Password" htmlFor="new-password">
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          {tooShort && <FieldError>Use at least {MIN_LENGTH} characters.</FieldError>}
          {sameAsCurrent && (
            <FieldError>Choose a password different from your current one.</FieldError>
          )}
        </Field>

        <Field label="Confirm New Password" htmlFor="confirm-password">
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && <FieldError>Both new-password fields must match.</FieldError>}
        </Field>
      </div>

      <div className="mt-6">
        <AuthSubmit pending={pending} disabled={!canSubmit}>
          {pending ? 'Updating…' : submitLabel}
        </AuthSubmit>
      </div>
    </form>
  )
}
