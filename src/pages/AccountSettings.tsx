import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, LoaderCircle, LogOut, ShieldAlert, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { ConfirmLogoutModal } from '@/components/auth/ConfirmLogoutModal'
import { RolePill } from '@/components/users/RolePill'
import { cn } from '@/lib/utils'
import { toApiError } from '@/lib/api/caller'
import { useMyProfile } from '@/hooks/useUserManagement'
import { formatTimestamp } from '@/lib/format'
import { tokenProfile } from '@/lib/jwt'
import type { UserRecord } from '@/lib/api/user-management.types'
import { useAuthStore } from '@/store/auth'

/*
  Account settings: the signed-in user's own record, and the two things they can do
  to their own session.

  Laid out from the Baseplate account screen — a left rail of sections against a
  single content column of cards — but drawn with this app's own tokens rather than
  that page's light palette, so it themes with everything else here.

  Everything on the profile side is read-only. update-user is org_admin-only and a
  full replace of the record (role and scope included), so a self-service edit here
  would either 403 for most roles or hand every user a form that can rewrite their
  own access. Changing a name or a phone number stays an admin action in the
  registry; what this page owns is the password.
*/

type Tab = 'profile' | 'password'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'password', label: 'Reset Password', icon: KeyRound },
]

/** Initial for the avatar disc: the name's first letter, or the email's. */
function initialOf(value: string): string {
  return value.trim().charAt(0).toUpperCase() || '?'
}

export function AccountSettings() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const signOut = useAuthStore((s) => s.signOut)

  // In the URL rather than component state, so a refresh keeps the panel open and
  // the two sections can be linked to directly.
  const tab: Tab = params.get('tab') === 'password' ? 'password' : 'profile'
  const openTab = (next: Tab) =>
    setParams(next === 'profile' ? {} : { tab: next }, { replace: true })

  const email = user?.email ?? null
  const profileQuery = useMyProfile(email)
  const record = profileQuery.data ?? null
  const profileError = profileQuery.error ? toApiError(profileQuery.error) : null

  /*
    Two sources, in order of authority.

    The registry row is the real record, but get-users is org_admin-only — so for a
    platform admin, a management user or a standard user it 403s and there is
    nothing behind it. The token is the fallback: whatever the backend chose to put
    in the claims, which is the only self-readable profile data a non-admin has.

    Read from the token rather than the cached `auth-user` blob beside it, so a
    session that predates a claim being added still picks it up.
  */
  const fromToken = useMemo(() => tokenProfile(token), [token])
  const fullName = record?.full_name ?? fromToken.fullName
  const phoneNumber = record?.phone_number ?? fromToken.phoneNumber
  // Only then is "your role cannot read this" the honest explanation for a blank.
  const registryClosed = Boolean(profileError)

  const toLogin = (notice?: string) => {
    signOut()
    navigate('/login', { replace: true, state: notice ? { notice } : undefined })
  }

  return (
    <div className="border-line bg-surface overflow-hidden rounded-xl border lg:grid lg:grid-cols-[220px_1fr]">
      <nav
        aria-label="Account sections"
        className="border-line border-b p-3 lg:border-r lg:border-b-0"
      >
        {/* A row above the panel on small screens, a rail beside it on desktop.
            Wraps rather than overflowing when three items don't fit a phone. */}
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => openTab(id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  tab === id
                    ? 'bg-primary/10 text-primary-bright font-medium'
                    : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            </li>
          ))}
          <li>
            {/* Sits with the sections because that is where the design puts it, but
                it is an action, not a panel — nothing below changes. */}
            <button
              type="button"
              onClick={() => setConfirmingLogout(true)}
              className="text-fg-muted hover:bg-critical/10 hover:text-critical-bright flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0 p-5 sm:p-6">
        {tab === 'profile' ? (
          <section aria-labelledby="account-profile-title" className="space-y-5">
            <h2 id="account-profile-title" className="text-fg text-lg font-semibold">
              My Profile
            </h2>

            <IdentityCard
              email={email}
              fullName={fullName}
              roleLabel={record?.role.name ?? user?.roleLabel ?? null}
              loading={profileQuery.isPending}
            />

            <Card title="Personal Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <ReadOnlyField
                  label="Name"
                  value={fullName ?? undefined}
                  loading={profileQuery.isPending}
                  missing={registryClosed ? 'Ask an admin' : '—'}
                />
                <ReadOnlyField label="Email" value={email ?? undefined} mono />
                <ReadOnlyField
                  label="Phone Number"
                  value={phoneNumber ?? undefined}
                  loading={profileQuery.isPending}
                  missing={registryClosed ? 'Ask an admin' : 'Not set'}
                  mono
                />
              </div>

              <p className="text-fg-subtle mt-5 text-xs">
                {registryClosed && !fullName && !phoneNumber
                  ? // Not a bug to hide: the registry is the only place these are
                    // kept, only an org admin can read it, and this session's token
                    // carries neither claim.
                    'Your name and phone number are held in the user registry, which only an organizational admin can read. Ask one to check or change them.'
                  : 'Maintained by an organizational admin in User Management — including your email, which is fixed once the account exists.'}
              </p>
            </Card>

            <Card title="Access & Scope">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className={labelClass}>Role</dt>
                  <dd className="mt-2">
                    {record ? (
                      <RolePill role={record.role} />
                    ) : (
                      <span className="text-fg text-sm">{user?.roleLabel ?? '—'}</span>
                    )}
                  </dd>
                </div>
                <ScopeRow record={record} />
                {record && (
                  <>
                    <div>
                      <dt className={labelClass}>Status</dt>
                      <dd className="text-fg mt-2 text-sm capitalize">{record.status}</dd>
                    </div>
                    <div>
                      <dt className={labelClass}>Member since</dt>
                      <dd className="text-fg mt-2 font-mono text-sm">
                        {formatTimestamp(record.created_at)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {!record && !profileQuery.isPending && (
                <p className="text-fg-subtle mt-5 text-xs">
                  Your role comes from the session token. Department and platform scope are part of
                  the registry record, which your role cannot read.
                </p>
              )}
            </Card>
          </section>
        ) : (
          <section aria-labelledby="account-password-title" className="space-y-5">
            <h2 id="account-password-title" className="text-fg text-lg font-semibold">
              Reset Password
            </h2>
            <Card title="Change your password">
              <div className="max-w-md">
                {/* The password that session was opened with is no longer the
                    account's, so the session goes with it: sign out and make them
                    prove the new one. The login screen renders the notice. */}
                <ChangePasswordForm
                  email={email}
                  onSuccess={() => toLogin('Password updated. Sign in with your new password.')}
                  submitLabel="Update Password"
                />
              </div>
              <p className="text-fg-subtle mt-4 text-xs">
                You will be signed out once the password changes, and will need to sign in again
                with the new one.
              </p>
            </Card>
          </section>
        )}
      </div>

      {confirmingLogout && (
        <ConfirmLogoutModal
          email={email}
          onClose={() => setConfirmingLogout(false)}
          onConfirm={() => toLogin()}
        />
      )}
    </div>
  )
}

const labelClass = 'text-fg-muted text-[13px]'

/** The name/role banner at the top of the profile panel. */
function IdentityCard({
  email,
  fullName,
  roleLabel,
  loading,
}: {
  email: string | null
  fullName: string | null
  roleLabel: string | null
  loading: boolean
}) {
  // Falls back to the email rather than a placeholder: this is the one line that
  // says who is signed in, and it must never be guesswork.
  const name = fullName || email || 'Not signed in'
  const role = roleLabel ?? '—'

  return (
    <div className="border-line bg-surface-2 flex items-center gap-4 rounded-xl border p-5">
      <div className="bg-primary/15 text-primary-bright grid size-16 shrink-0 place-items-center rounded-full font-mono text-2xl font-bold">
        {initialOf(name)}
      </div>
      <div className="min-w-0">
        <p className="text-fg truncate text-lg font-semibold">{name}</p>
        <p className="text-fg-muted mt-0.5 flex items-center gap-2 truncate text-sm">
          {role}
          {loading && (
            <LoaderCircle aria-label="Loading profile" className="size-3.5 animate-spin" />
          )}
        </p>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-line bg-surface-2 rounded-xl border p-5">
      <h3 className="text-fg mb-5 text-[15px] font-semibold">{title}</h3>
      {children}
    </div>
  )
}

/**
 * A value styled as the design's filled input, but rendered as text.
 *
 * Deliberately not a disabled `<input>`: nothing here is editable, and a control
 * that looks like a form field invites the user to try.
 */
function ReadOnlyField({
  label,
  value,
  loading,
  missing = '—',
  mono,
}: {
  label: string
  value?: string
  loading?: boolean
  /** Shown when there is no value — why it is absent, when that is known. */
  missing?: string
  mono?: boolean
}) {
  const filled = Boolean(value)
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p
        className={cn(
          'border-line bg-input mt-2 truncate rounded-lg border px-3 py-2.5 text-sm',
          filled ? 'text-fg' : 'text-fg-subtle',
          mono && filled && 'font-mono',
        )}
        title={value}
      >
        {loading && !filled ? 'Loading…' : (value ?? missing)}
      </p>
    </div>
  )
}

/** Whichever scope the role actually carries — most roles carry none. */
function ScopeRow({ record }: { record: UserRecord | null }) {
  if (!record) return null

  if (record.platforms?.length) {
    return (
      <div>
        <dt className={labelClass}>Platform access</dt>
        <dd className="text-fg mt-2 text-sm">{record.platforms.join(', ')}</dd>
      </div>
    )
  }

  if (record.department) {
    const subs = record.sub_departments?.map((s) => s.name) ?? []
    return (
      <div>
        <dt className={labelClass}>Department</dt>
        <dd className="text-fg mt-2 text-sm">
          {record.department.name}
          {subs.length > 0 && <span className="text-fg-muted"> · {subs.join(', ')}</span>}
        </dd>
      </div>
    )
  }

  return (
    <div>
      <dt className={labelClass}>Scope</dt>
      <dd className="text-fg-muted mt-2 flex items-center gap-1.5 text-sm">
        <ShieldAlert className="size-4 shrink-0" />
        Organization-wide
      </dd>
    </div>
  )
}
