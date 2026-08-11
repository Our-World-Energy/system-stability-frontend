import { useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { useAuthStore } from '@/store/auth'

interface ChangePasswordRouteState {
  /** Return path for a voluntary change, such as one opened from Settings. */
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
 * only differences are the heading and where a success returns to. The fields and
 * their rules live in `ChangePasswordForm`, shared with the account page's Reset
 * Password panel.
 */
export function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const mustChange = useAuthStore((s) => s.mustChangePassword)
  const email = useAuthStore((s) => s.user?.email)

  const state = location.state as ChangePasswordRouteState | null

  return (
    <AuthShell
      title={mustChange ? 'Set a New Password' : 'Change Password'}
      subtitle={
        mustChange
          ? 'Your account is still on the temporary password issued when it was created. Choose a new one to continue.'
          : 'Enter your current password, then choose a new one.'
      }
    >
      <ChangePasswordForm
        email={email}
        autoFocus
        onSuccess={() => navigate(state?.from ?? '/', { replace: true })}
      />
    </AuthShell>
  )
}
