import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { credentials, type CatalogFilter, type Credential } from '@/lib/credentials-data'
import { CredentialTable } from '@/components/credentials/CredentialTable'
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

/** The dialog currently open in the request flow. */
type FlowStep =
  | { kind: 'request'; credential: Credential }
  | { kind: 'approved'; credential: Credential }
  | { kind: 'denied'; credential: Credential }
  | null

export function CredentialManager() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('all')
  const [flow, setFlow] = useState<FlowStep>(null)

  const hasQuery = query.trim().length > 0

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return credentials.filter((c) => {
      const matchesFilter = filter === 'all' || c.eligibility === filter
      const matchesQuery = c.name.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [query, filter])

  // Demo policy: auto-grant credentials are approved instantly; anything that
  // requires approval is denied so both outcome dialogs are reachable. This is
  // where the provisioning API call will live once integrated.
  const handleSubmit = (draft: AccessRequestDraft) => {
    const approved = draft.credential.eligibility === 'auto_grants'
    setFlow({ kind: approved ? 'approved' : 'denied', credential: draft.credential })
  }

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Credential Catalog</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Search for the credential you need. You can only ever see and request one at a time.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </header>

      <div className="relative">
        <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search credentials by name…"
          className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border pr-4 pl-10 font-mono text-sm transition-colors outline-none focus:ring-2"
        />
      </div>

      {hasQuery ? (
        <>
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
            onRequest={(credential) => setFlow({ kind: 'request', credential })}
          />
        </>
      ) : (
        <EmptyState />
      )}

      <RequestAccessModal
        credential={flow?.kind === 'request' ? flow.credential : null}
        onClose={() => setFlow(null)}
        onSubmit={handleSubmit}
      />

      {flow?.kind === 'approved' && (
        <RequestApprovedModal credential={flow.credential} onClose={() => setFlow(null)} />
      )}

      {flow?.kind === 'denied' && (
        <RequestDeniedModal
          credential={flow.credential}
          onClose={() => setFlow(null)}
          onContactAdmin={() => setFlow(null)}
        />
      )}
    </div>
  )
}

/** Shown before the user has typed a query — the catalog reveals nothing by default. */
function EmptyState() {
  return (
    <div className="border-line grid place-items-center rounded-lg border border-dashed py-20 text-center">
      <Search className="text-fg-subtle size-8" />
      <p className="text-fg mt-4 text-sm font-medium">Enter a credential name to begin</p>
      <p className="text-fg-muted mt-1 text-sm">
        You can only ever see and request one credential at a time.
      </p>
    </div>
  )
}
