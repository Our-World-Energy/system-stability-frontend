import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordInput } from '@/components/auth/AuthInput'
import { AuthLink, AuthSubmit, BackToLogin } from '@/components/auth/AuthActions'
import { AuthAlert, FieldError } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { resetPassword } from '@/lib/api/user-management'

/** Backend rule: at least 8 characters. */
const MIN_LENGTH = 8

/**
 * The mailed link lands here as `/reset-password?token=…`. Everything the call
 * needs is in that query param — there is no session and nothing carried over from
 * the Forgot Password screen, so the page works in whichever browser the mail was
 * opened in.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Set when the backend rejects the token itself: nothing typed here can fix
  // that, so the form is replaced with a way to request a fresh link.
  const [linkDead, setLinkDead] = useState(false)
  // Validation messages appear only after a submit attempt, so the form doesn't
  // scold the user mid-typing.
  const [validated, setValidated] = useState(false)
  // The token is single-use, so a second request with it always fails — even when
  // the first one succeeded. `pending` alone is a render behind; this closes the
  // gap for a double-click landing inside the same tick.
  const spent = useRef(false)

  const token = params.get('token')?.trim() ?? ''

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= MIN_LENGTH && password === confirm

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setValidated(true)
    if (!canSubmit || pending || spent.current) return

    spent.current = true
    setPending(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Sign in with your new password.' },
      })
    } catch (err) {
      const apiError = toApiError(err)
      setError(apiError.message)
      // Unknown, expired and already-used tokens all come back with this one
      // message — they are the same dead end from here, and the only way out is a
      // new link. Anything else (too short, a 500) is worth another attempt.
      setLinkDead(apiError.status === 400 && /invalid or expired/i.test(apiError.message))
      spent.current = false
      setPending(false)
    }
  }

  if (!token || linkDead) {
    return (
      <AuthShell title="Reset Link Not Valid">
        <AuthAlert>
          {error ?? 'This password reset link is invalid or has expired. Request a new one.'}
        </AuthAlert>
        <div className="mt-7 flex justify-center">
          <AuthLink to="/forgot-password" accent>
            Request a new link
          </AuthLink>
        </div>
        <BackToLogin />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create a New Password">
      <form onSubmit={handleSubmit} noValidate>
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

        <div className="space-y-5">
          <Field label="New Password" htmlFor="new-password">
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-hint"
            />
            {validated && tooShort ? (
              <FieldError>Use at least {MIN_LENGTH} characters.</FieldError>
            ) : (
              <p id="password-hint" className="text-fg-subtle mt-2 text-xs">
                At least {MIN_LENGTH} characters.
              </p>
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
            {validated && mismatch && <FieldError>Both passwords must match.</FieldError>}
          </Field>
        </div>

        <div className="mt-8">
          <AuthSubmit pending={pending} icon={Check}>
            {pending ? 'Updating…' : 'Reset Password'}
          </AuthSubmit>
        </div>

        <BackToLogin />
      </form>
    </AuthShell>
  )
}
