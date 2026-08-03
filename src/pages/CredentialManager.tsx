import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CredentialTable } from '@/components/credentials/CredentialTable'
import { CredentialSearchScreen } from '@/components/credentials/CredentialSearchScreen'
import { RequestAccessModal } from '@/components/credentials/RequestAccessModal'
import { RequestApprovedModal } from '@/components/credentials/RequestApprovedModal'
import { useCredentialSearch } from '@/hooks/useCredentials'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { credentialErrorMessage } from '@/lib/api/credentials'
import type { Credential, Grant } from '@/lib/api/types'

/** Catalog filter presets shown as chips above the table. */
type CatalogFilter = 'all' | 'auto_grants' | 'requires_approval'

const filters: { id: CatalogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'auto_grants', label: 'Auto-grants to me' },
  { id: 'requires_approval', label: 'Requires approval' },
]

/** A live elevation window, kept alongside the credential it belongs to. */
type ActiveGrant = { credential: Credential; grant: Grant }

export function CredentialManager() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('all')

  const [requestFor, setRequestFor] = useState<Credential | null>(null)
  const [viewing, setViewing] = useState<ActiveGrant | null>(null)

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

  const visible = useMemo(() => {
    const rows = search.data ?? []
    if (filter === 'all') return rows
    return rows.filter((c) => (filter === 'auto_grants' ? c.auto_grant : !c.auto_grant))
  }, [search.data, filter])

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
          grants={expiryMap}
          now={now}
          loading={search.isFetching}
          error={search.isError ? credentialErrorMessage(search.error, 'Search failed.') : null}
          onRequest={setRequestFor}
          onViewGrant={(cred) => {
            const entry = grants[cred.id]
            if (entry) setViewing(entry)
          }}
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
    </>
  )
}
