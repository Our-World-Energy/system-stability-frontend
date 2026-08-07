import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordInput } from '@/components/auth/AuthInput'
import { AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert, FieldError } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { changePassword } from '@/lib/api/user-management'
import { useAuthStore } from '@/store/auth'

/** Backend rule: at least 8 characters, and different from the current one. */
const MIN_LENGTH = 8

interface ChangePasswordRouteState {
  /** Where the user was originally headed, forwarded by Login. */
  from?: string
}

/**
 * The forced "set a new password" screen.
 *
 * An account provisioned by an admin starts on a backend-generated password and
 * comes back from login with `must_change_password: true`. RequireAuth funnels
 * every authenticated route here until this call succeeds, so it is the one gate
 * between a freshly created account and the app.
 *
 * The same screen backs the voluntary change linked from Settings — change-password
 * is open to any authenticated role, not just accounts the redirect drags here. The
 * only differences are the heading and where a success returns to.
 */
export function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const mustChange = useAuthStore((s) => s.mustChangePassword)
  const email = useAuthStore((s) => s.user?.email)
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const currentRef = useRef<HTMLInputElement>(null)

  const state = location.state as ChangePasswordRouteState | null

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
      // locally so RequireAuth stops funnelling every route back here.
      clearMustChangePassword()
      navigate(state?.from ?? '/', { replace: true })
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
    <AuthShell
      title={mustChange ? 'Set a New Password' : 'Change Password'}
      subtitle={
        mustChange
          ? 'Your account is still on the temporary password issued when it was created. Choose a new one to continue.'
          : 'Enter your current password, then choose a new one.'
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

        <div className="space-y-5">
          {/* Shown read-only so the user can see which account they are changing —
              change-password always acts on the caller's own account. */}
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
              autoFocus
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
            {pending ? 'Updating…' : 'Update Password'}
          </AuthSubmit>
        </div>
      </form>
    </AuthShell>
  )
}
