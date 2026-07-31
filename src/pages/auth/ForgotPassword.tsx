import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthInput } from '@/components/auth/AuthInput'
import { AuthSubmit, BackToLogin } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { authErrorMessage, requestPasswordOtp } from '@/lib/auth-api'
import { startResetFlow } from '@/lib/auth-flow'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const trimmed = email.trim()

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    try {
      await requestPasswordOtp(trimmed)
      startResetFlow(trimmed)
      navigate('/verify-otp')
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send a verification code. Please try again.'))
      setPending(false)
    }
  }

  return (
    <AuthShell title="Forgot Password">
      <form onSubmit={handleSubmit} noValidate>
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

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

        <div className="mt-6">
          <AuthSubmit pending={pending} disabled={!trimmed}>
            {pending ? 'Sending code…' : 'Request OTP'}
          </AuthSubmit>
        </div>

        <BackToLogin />
      </form>
    </AuthShell>
  )
}
