import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoaderCircle, RefreshCw, ShieldCheck, Timer } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { OtpInput } from '@/components/auth/OtpInput'
import { AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { DemoHint } from '@/components/auth/DemoHint'
import { formatCountdown, useCountdown } from '@/hooks/useCountdown'
import { authErrorMessage, requestPasswordOtp, verifyPasswordOtp } from '@/lib/auth-api'
import { readResetFlow, setResetToken, startResetFlow } from '@/lib/auth-flow'

const CODE_LENGTH = 6

export function VerifyOtp() {
  const navigate = useNavigate()
  // Snapshot at mount, then updated locally on resend — the countdown must not
  // re-read sessionStorage on every render.
  const [flow, setFlow] = useState(readResetFlow)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)

  const remaining = useCountdown(flow?.expiresAt ?? 0)

  // Deep-linked or refreshed after the flow was cleared — restart from the top.
  if (!flow) return <Navigate to="/forgot-password" replace />

  const expired = remaining === 0

  const verify = async (value: string) => {
    if (value.length < CODE_LENGTH || pending || expired) return

    setPending(true)
    setError(null)
    try {
      const resetToken = await verifyPasswordOtp(flow.email, value)
      setResetToken(resetToken)
      navigate('/reset-password')
    } catch (err) {
      setError(authErrorMessage(err, 'That code is not valid. Check it and try again.'))
      setCode('')
      setPending(false)
    }
  }

  const resend = async () => {
    if (resending) return
    setResending(true)
    setError(null)
    try {
      await requestPasswordOtp(flow.email)
      setFlow(startResetFlow(flow.email))
      setCode('')
    } catch (err) {
      setError(authErrorMessage(err, 'Could not resend the code. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="OTP Verification"
      subtitle={
        <>
          Please enter the {CODE_LENGTH}-digit verification code sent to{' '}
          <span className="text-primary-bright">{flow.email}</span>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void verify(code)
        }}
        noValidate
      >
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value)
            setError(null) // Retyping clears the rejection so the boxes leave the error state.
          }}
          onComplete={(value) => void verify(value)}
          length={CODE_LENGTH}
          disabled={pending || expired}
          invalid={Boolean(error)}
        />

        <p className="mt-7 flex items-center justify-center gap-2 font-mono text-[13px]">
          {expired ? (
            <span className="text-critical-bright">Code expired — request a new one</span>
          ) : (
            <>
              <Timer className="text-fg-muted size-4" />
              <span className="text-fg-muted">Session expires in</span>
              <span className="text-primary-bright">{formatCountdown(remaining)}</span>
            </>
          )}
        </p>

        <div className="mt-5">
          <AuthSubmit
            pending={pending}
            disabled={code.length < CODE_LENGTH || expired}
            icon={ShieldCheck}
          >
            {pending ? 'Verifying…' : 'Verify OTP'}
          </AuthSubmit>
        </div>

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-fg hover:text-primary-bright focus-visible:ring-primary/30 inline-flex items-center gap-2 rounded font-mono text-[13px] transition-colors outline-none focus-visible:ring-2 disabled:opacity-50"
          >
            {resending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {resending ? 'Sending…' : 'Resend Code'}
          </button>
        </div>

        <DemoHint />
      </form>
    </AuthShell>
  )
}
