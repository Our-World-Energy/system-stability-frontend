import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthInput, PasswordInput } from '@/components/auth/AuthInput'
import { AuthLink, AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { useAuthStore } from '@/store/auth'

/** Location state set by RequireAuth (where to return to) and by ResetPassword. */
interface LoginRouteState {
  from?: string
  notice?: string
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const logIn = useAuthStore((s) => s.logIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const state = location.state as LoginRouteState | null
  const canSubmit = email.trim().length > 0 && password.length > 0

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!canSubmit || pending) return

    setPending(true)
    setError(null)
    try {
      const { must_change_password } = await logIn(email.trim(), password)

      // An account created by an admin starts on a backend-generated password, and
      // stays flagged until change-password runs. Send it straight to the forced
      // screen instead of the app — RequireAuth would bounce it back here anyway.
      if (must_change_password) {
        navigate('/change-password', { replace: true, state: { from: state?.from } })
        return
      }
      // Otherwise return the user to the page that bounced them here, if any.
      navigate(state?.from ?? '/', { replace: true })
    } catch (err) {
      // The backend's own wording — "invalid email or password", "account is
      // disabled" — is written to be shown as-is, so it goes straight in.
      setError(toApiError(err).message)
      setPending(false)
    }
  }

  return (
    <AuthShell title="User Login">
      <form onSubmit={handleSubmit} noValidate>
        {state?.notice && (
          <AuthAlert tone="success" className="mb-6">
            {state.notice}
          </AuthAlert>
        )}
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

        <div className="space-y-5">
          <Field label="Email Address" htmlFor="email">
            <AuthInput
              id="email"
              icon={Mail}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Secure Password" htmlFor="password">
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3 flex justify-end">
          <AuthLink to="/forgot-password" icon={KeyRound} accent>
            Forgot Password?
          </AuthLink>
        </div>

        <div className="mt-6">
          <AuthSubmit pending={pending} disabled={!canSubmit}>
            {pending ? 'Signing in…' : 'Login'}
          </AuthSubmit>
        </div>
      </form>
    </AuthShell>
  )
}
