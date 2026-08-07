import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CredentialTable } from '@/components/credentials/CredentialTable'
import { CredentialSearchScreen } from '@/components/credentials/CredentialSearchScreen'
import { RequestAccessModal } from '@/components/credentials/RequestAccessModal'
import { RequestApprovedModal } from '@/components/credentials/RequestApprovedModal'
import { CredentialSecretModal } from '@/components/credentials/CredentialSecretModal'
import { RequestRotationModal } from '@/components/credentials/RequestRotationModal'
import { RotateCredentialModal } from '@/components/credentials/admin/RotateCredentialModal'
import { useCredentialSearch, useRevealCredentialDetails } from '@/hooks/useCredentials'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePendingStats } from '@/hooks/useStats'
import { useAuthStore } from '@/store/auth'
import { canRequestRotation, canRotateCredentials } from '@/lib/credential-permissions'
import { credentialErrorMessage } from '@/lib/api/credentials'
import type { RevealedCredential } from '@/lib/api/credentials'
import type { Credential, Grant } from '@/lib/api/types'

/**
 * Epoch ms this credential's access window closes, or null when it has no limit
 * (auto-access). The row's own grant wins; a just-submitted session grant is the
 * fallback until the search refetches.
 */
function accessExpiry(cred: Credential, session: Record<string, ActiveGrant>): number | null {
  if (cred.request_status === 'granted' && cred.grant) {
    return new Date(cred.grant.expires_at).getTime()
  }
  const entry = session[cred.id]
  return entry ? new Date(entry.grant.expires_at).getTime() : null
}

/** A live elevation window, kept alongside the credential it belongs to. */
type ActiveGrant = { credential: Credential; grant: Grant }

export function CredentialManager() {
  const [query, setQuery] = useState('')

  const [requestFor, setRequestFor] = useState<Credential | null>(null)
  const [viewing, setViewing] = useState<ActiveGrant | null>(null)

  // Reveal dialog: the credential whose secret is being shown, and the decrypted
  // details once they arrive. Both are cleared on close so the plaintext never
  // outlives the dialog.
  const [revealFor, setRevealFor] = useState<Credential | null>(null)
  const [revealed, setRevealed] = useState<RevealedCredential | null>(null)
  const revealSecret = useRevealCredentialDetails({ onSuccess: setRevealed })

  // Role shapes the per-row rotation controls on this requester view:
  //   Platform / Dev admins rotate directly; Management proposes a rotation.
  // Both are hidden for everyone else, and the API enforces the real rule anyway.
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role ?? null)
  const canRotate = canRotateCredentials(role)
  const canRequestRot = canRequestRotation(role)
  // Only the Platform admin works the approval queue from here, so only they get
  // the Pending Actions button — and therefore the pending-stats subscription.
  const isPlatformAdmin = role === 'platform_admin'
  const pendingStats = usePendingStats(isPlatformAdmin)
  const totalPending = pendingStats.data?.total_pending ?? 0

  const [rotateFor, setRotateFor] = useState<Credential | null>(null)
  const [rotationFor, setRotationFor] = useState<Credential | null>(null)

  // Grants issued during this session, credential id → window. The service has no
  // "my active grants" route, so this cannot survive a reload — a window opened
  // in an earlier session is real on the backend but invisible here.
  const [grants, setGrants] = useState<Record<string, ActiveGrant>>({})

  const debounced = useDebouncedValue(query, 300)
  const search = useCredentialSearch(debounced)

  // 1s clock driving the countdowns in the table and the grant dialog.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const openReveal = (credential: Credential) => {
    setRevealed(null)
    setRevealFor(credential)
    revealSecret.mutate(credential.id, {
      // A fetch/decrypt failure toasts via the hook; drop the dialog rather than
      // leaving it spinning.
      onError: () => setRevealFor(null),
    })
  }

  const closeReveal = () => {
    setRevealFor(null)
    setRevealed(null)
    revealSecret.reset()
  }

  const expiryMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [id, entry] of Object.entries(grants)) {
      map[id] = new Date(entry.grant.expires_at).getTime()
    }
    return map
  }, [grants])

  return (
    <>
      <CredentialSearchScreen
        query={query}
        onQueryChange={setQuery}
        subheading="You can only ever see and request one credential at a time."
        actions={
          <>
            <span className="border-line bg-surface text-fg-muted rounded-lg border px-3 py-1.5 font-mono text-xs">
              Your access: <span className="text-primary-bright">Requester</span>
            </span>
            {isPlatformAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/credentials/admin/pending')}
                className="relative"
              >
                <Clock className="size-4" />
                Pending Actions
                {totalPending > 0 && (
                  <span className="bg-critical ring-canvas absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] font-bold text-white ring-2">
                    {totalPending > 99 ? '99+' : totalPending}
                  </span>
                )}
              </Button>
            )}
            <Link
              to="/credentials/logs"
              className="bg-primary text-canvas hover:bg-primary-bright inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <ScrollText className="size-4" />
              Request Log&rsquo;s
            </Link>
          </>
        }
      >
        <CredentialTable
          credentials={search.data ?? []}
          grants={expiryMap}
          now={now}
          loading={search.isFetching}
          error={search.isError ? credentialErrorMessage(search.error, 'Search failed.') : null}
          onRequest={setRequestFor}
          onReveal={openReveal}
          onRotate={canRotate ? setRotateFor : undefined}
          onRequestRotation={canRequestRot ? setRotationFor : undefined}
        />
      </CredentialSearchScreen>

      <RequestAccessModal
        credential={requestFor}
        onClose={() => setRequestFor(null)}
        onSubmitted={(outcome, credential) => {
          // An auto-granting credential comes back already granted; anything else
          // is queued, and the toast raised by the hook is the whole story.
          if (!outcome?.grant) return
          const entry = { credential, grant: outcome.grant }
          setGrants((g) => ({ ...g, [credential.id]: entry }))
          setViewing(entry)
        }}
      />

      {viewing && (
        <RequestApprovedModal
          credential={viewing.credential}
          grant={viewing.grant}
          onClose={() => setViewing(null)}
        />
      )}

      <CredentialSecretModal
        open={revealFor !== null}
        loading={revealSecret.isPending}
        details={revealed}
        credentialName={revealFor?.name}
        expiresAt={revealFor ? accessExpiry(revealFor, grants) : null}
        onClose={closeReveal}
      />

      {rotateFor && (
        <RotateCredentialModal record={rotateFor} onClose={() => setRotateFor(null)} />
      )}
      {rotationFor && (
        <RequestRotationModal record={rotationFor} onClose={() => setRotationFor(null)} />
      )}
    </>
  )
}
