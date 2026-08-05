import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export function Settings() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-500">Platform configuration and preferences.</p>

      {/* change-password is open to any authenticated role and acts on the caller's
          own account, so every user needs a way in — not just the accounts the
          forced-change redirect drags here after an admin provisions them. */}
      <section className="border-line bg-surface rounded-lg border p-5">
        <h2 className="text-fg text-sm font-semibold">Security</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-fg text-[15px] font-medium">Password</p>
            <p className="text-fg-muted mt-0.5 text-[13px]">
              {user
                ? `Change the password for ${user.email}.`
                : 'Change your account password.'}
            </p>
          </div>
          <Link
            to="/change-password"
            // Returns here rather than the dashboard once the change succeeds.
            state={{ from: '/settings' }}
            className="border-line-bright text-fg-muted hover:bg-surface-3 hover:text-fg flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors"
          >
            <KeyRound className="size-4" />
            Change password
          </Link>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-400">Settings panel will appear here.</p>
      </div>
    </div>
  )
}
