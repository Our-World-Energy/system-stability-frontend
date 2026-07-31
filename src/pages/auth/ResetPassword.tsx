import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordInput } from '@/components/auth/AuthInput'
import { AuthSubmit, BackToLogin } from '@/components/auth/AuthActions'
import { AuthAlert, FieldError } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { authErrorMessage, resetPassword } from '@/lib/auth-api'
import { clearResetFlow, readResetFlow } from '@/lib/auth-flow'

const MIN_LENGTH = 8

export function ResetPassword() {
  const navigate = useNavigate()
  const [flow] = useState(readResetFlow)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Validation messages appear only after a submit attempt, so the form doesn't
  // scold the user mid-typing.
  const [validated, setValidated] = useState(false)

  // The reset token only exists after a verified OTP; without it this page can do
  // nothing, so send the user back to the start of the flow. Bound to a local so
  // the narrowing survives into the async submit handler.
  const resetToken = flow?.resetToken
  if (!resetToken) return <Navigate to="/forgot-password" replace />

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= MIN_LENGTH && password === confirm

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setValidated(true)
    if (!canSubmit || pending) return

    setPending(true)
    setError(null)
    try {
      await resetPassword(resetToken, password)
      clearResetFlow()
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Sign in with your new password.' },
      })
    } catch (err) {
      setError(authErrorMessage(err, 'Could not update your password. Please try again.'))
      setPending(false)
    }
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
