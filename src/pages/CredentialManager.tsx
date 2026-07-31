import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  credentials,
  GRANT_WINDOW_MS,
  type CatalogFilter,
  type Credential,
} from '@/lib/credentials-data'
import { CredentialTable } from '@/components/credentials/CredentialTable'
import { CredentialSearchScreen } from '@/components/credentials/CredentialSearchScreen'
import {
  RequestAccessModal,
  type AccessRequestDraft,
} from '@/components/credentials/RequestAccessModal'
import { RequestApprovedModal } from '@/components/credentials/RequestApprovedModal'
import { RequestDeniedModal } from '@/components/credentials/RequestDeniedModal'

const filters: { id: CatalogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'auto_grants', label: 'Auto-grants to me' },
  { id: 'requires_approval', label: 'Requires approval' },
]

export function CredentialManager() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('all')

  // Which dialog is open, if any.
  const [requestCred, setRequestCred] = useState<Credential | null>(null)
  const [deniedCred, setDeniedCred] = useState<Credential | null>(null)
  const [viewCred, setViewCred] = useState<Credential | null>(null)

  // Active grants (credential id → expiry epoch ms) and a 1s clock driving the
  // countdowns in the table and the approved dialog.
  const [grants, setGrants] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return credentials.filter((c) => {
      const matchesFilter = filter === 'all' || c.eligibility === filter
      const matchesQuery = c.name.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [query, filter])

  // Demo policy: auto-grant credentials are approved instantly (opening a copy
  // window on the row); anything requiring approval is denied so both outcome
  // dialogs stay reachable. This is where the provisioning API call will live.
  const handleSubmit = (draft: AccessRequestDraft) => {
    setRequestCred(null)
    if (draft.credential.eligibility === 'auto_grants') {
      setGrants((g) => ({ ...g, [draft.credential.id]: Date.now() + GRANT_WINDOW_MS }))
      setViewCred(draft.credential)
    } else {
      setDeniedCred(draft.credential)
    }
  }

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
            <Link
              to="/credentials/logs"
              className="bg-primary text-canvas hover:bg-primary-bright inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <ScrollText className="size-4" />
              Request Log's
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'border-primary/40 bg-primary/10 text-primary-bright'
                  : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <CredentialTable
          credentials={visible}
          grants={grants}
          now={now}
          onRequest={setRequestCred}
          onViewKey={setViewCred}
        />
      </CredentialSearchScreen>

      <RequestAccessModal
        credential={requestCred}
        onClose={() => setRequestCred(null)}
        onSubmit={handleSubmit}
      />

      {viewCred && (
        <RequestApprovedModal
          credential={viewCred}
          expiresAt={grants[viewCred.id] ?? 0}
          onClose={() => setViewCred(null)}
        />
      )}

      {deniedCred && (
        <RequestDeniedModal
          credential={deniedCred}
          onClose={() => setDeniedCred(null)}
          onContactAdmin={() => setDeniedCred(null)}
        />
      )}
    </>
  )
}
