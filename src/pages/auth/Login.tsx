import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthInput, PasswordInput } from '@/components/auth/AuthInput'
import { AuthLink, AuthSubmit } from '@/components/auth/AuthActions'
import { AuthAlert } from '@/components/auth/AuthFeedback'
import { Field } from '@/components/ui/Field'
import { toApiError } from '@/lib/api/caller'
import { isRemembered, rememberedEmail, takeSessionNotice } from '@/lib/auth-storage'
import { useAuthStore } from '@/store/auth'

/** Location state used by ResetPassword and session-expiry notices. */
interface LoginRouteState {
  notice?: string
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const logIn = useAuthStore((s) => s.logIn)

  // Prefilled from the last remembered sign-in, so the common case is one field
  // and a button. Only ever the address — a stored password would be a liability
  // with no upside, since the browser's own password manager does that job better.
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(isRemembered)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Why the app bounced them here, if it did: an expired token, or access changed
  // out from under them by an admin. Left by `endSession` on the way out.
  const [signedOut, setSignedOut] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Reading it clears it, so it shows once. Guarded rather than assigned
    // straight through: StrictMode runs this effect twice in dev, and the second
    // run finds nothing left to read.
    const notice = takeSessionNotice()
    if (notice) setSignedOut(notice)
  }, [])

  /*
    Adopt whatever the browser filled in.

    Chrome and most password managers write straight to the input's value without
    firing an event React listens for, so the form can look complete while state
    is still empty. Re-checked shortly after mount as well, because a manager can
    fill a beat after the page settles.
  */
  useEffect(() => {
    const adopt = () => {
      const filledEmail = emailRef.current?.value
      const filledPassword = passwordRef.current?.value
      if (filledEmail) setEmail((current) => (current === filledEmail ? current : filledEmail))
      if (filledPassword)
        setPassword((current) => (current === filledPassword ? current : filledPassword))
    }
    adopt()
    const timer = setTimeout(adopt, 300)
    return () => clearTimeout(timer)
  }, [])

  const state = location.state as LoginRouteState | null

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (pending) return

    // The inputs, not the state, are the source of truth at this moment: an
    // autofill React never heard about is still a filled form, and refusing to
    // send it is the bug this reads around.
    const typedEmail = (emailRef.current?.value ?? email).trim()
    const typedPassword = passwordRef.current?.value ?? password
    if (!typedEmail || !typedPassword) {
      setError('Enter your email address and password.')
      ;(typedEmail ? passwordRef : emailRef).current?.focus()
      return
    }

    setPending(true)
    setError(null)
    try {
      const { must_change_password } = await logIn(typedEmail, typedPassword, remember)

      // An account created by an admin starts on a backend-generated password, and
      // stays flagged until change-password runs. Send it straight to the forced
      // screen instead of the app — RequireAuth would bounce it back here anyway.
      if (must_change_password) {
        navigate('/change-password', { replace: true })
        return
      }
      // Every successful sign-in starts from the same orientation point, even if
      // a protected deep link originally sent the user to this screen.
      navigate('/', { replace: true })
    } catch (err) {
      // The backend's own wording — "invalid email or password", "account is
      // disabled" — is written to be shown as-is, so it goes straight in.
      setError(toApiError(err).message)
      // Clear the rejected password and put the cursor back in the box, so the
      // next attempt is a straight retype rather than select-all-then-type. The
      // email is left alone deliberately: it is rarely the thing that was wrong,
      // and re-entering a long address on every mistyped password is punishing.
      setPassword('')
      setPending(false)
      passwordRef.current?.focus()
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
        {/* Dropped as soon as they try again: by then it is explaining a sign-out
            they have already answered, and any new error belongs in its place. */}
        {signedOut && !error && <AuthAlert className="mb-6">{signedOut}</AuthAlert>}
        {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

        <div className="space-y-5">
          <Field label="Email Address" htmlFor="email">
            <AuthInput
              id="email"
              ref={emailRef}
              icon={Mail}
              type="email"
              autoComplete="email"
              // The caret starts wherever there is still something to type.
              autoFocus={!email}
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Secure Password" htmlFor="password">
            <PasswordInput
              id="password"
              ref={passwordRef}
              autoComplete="current-password"
              autoFocus={Boolean(email)}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {/*
            Two things at once, which is what the control is worth here: it keeps
            the session in localStorage rather than sessionStorage, so closing the
            browser does not end it, and it offers this address back next time.
            Unticked, the session dies with the tab — the borrowed-machine case.

            It cannot extend the session beyond the token's own 8 hours; the API
            issues no refresh token, so that would need a backend change.
          */}
          <label className="text-fg-muted hover:text-fg flex cursor-pointer items-center gap-2 font-mono text-[13px] transition-colors">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-primary-bright size-4 cursor-pointer"
            />
            Remember me
          </label>
          <AuthLink to="/forgot-password" icon={KeyRound} accent>
            Forgot Password?
          </AuthLink>
        </div>

        {/* Never disabled on the strength of what React thinks is in the fields —
            it cannot see an autofill, and a button that looks broken is worse than
            one that answers with "enter your email address and password". */}
        <div className="mt-6">
          <AuthSubmit pending={pending}>{pending ? 'Signing in…' : 'Login'}</AuthSubmit>
        </div>
      </form>
    </AuthShell>
  )
}
