import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthInput } from '@/components/auth/AuthInput'
import { AuthSubmit, BackToLogin } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { forgotPassword } from '@/lib/api/user-management'

/**
 * The backend's copy is written all-lowercase ("if an account exists…"), which
 * reads as a glitch at the head of a banner. Only the first letter is touched —
 * the wording itself is shown exactly as sent.
 */
function sentence(message: string): string {
  const text = message.trim()
  return text ? text[0].toUpperCase() + text.slice(1) : ''
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const trimmed = email.trim()

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    try {
      // Deliberately not a two-state UI. The backend answers the same way for a
      // real account, a disabled one and an address that has never existed, so
      // "sent" here means "the request was accepted", not "that account exists" —
      // and the screen must not imply otherwise.
      const message = await forgotPassword(trimmed)
      setSent(
        sentence(message) || 'If an account exists for this email, a reset link has been sent.',
      )
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter the email address on your account and we'll send a link to set a new password."
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}
        {sent && (
          <AuthAlert tone="success" className="mb-6">
            {sent} The link is valid for one hour.
          </AuthAlert>
        )}

        <Field label="Email Address" htmlFor="email">
          <AuthInput
            id="email"
            icon={Mail}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              // A different address is a different request; drop the previous
              // confirmation so it can't be read as applying to what's now typed.
              setSent(null)
              setError(null)
            }}
          />
        </Field>

        {/* The form stays on screen after a send: a mistyped address is the most
            likely reason no mail arrives, and this is the only way to correct it. */}
        <div className="mt-6">
          <AuthSubmit pending={pending} disabled={!trimmed} icon={Send}>
            {pending ? 'Sending link…' : sent ? 'Send link again' : 'Send Reset Link'}
          </AuthSubmit>
        </div>

        <BackToLogin />
      </form>
    </AuthShell>
  )
}
