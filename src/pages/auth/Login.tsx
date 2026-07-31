import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthInput, PasswordInput } from '@/components/auth/AuthInput'
import { AuthLink, AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { authErrorMessage, login } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth'

/** Location state set by RequireAuth (where to return to) and by ResetPassword. */
interface LoginRouteState {
  from?: string
  notice?: string
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)

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
      const { token, user } = await login(email.trim(), password)
      signIn(token, user)
      // Return the user to the page that bounced them here, if any.
      navigate(state?.from ?? '/', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err, 'Could not sign you in. Check your email and password.'))
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
