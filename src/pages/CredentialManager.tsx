import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { credentials, type CatalogFilter, type Credential } from '@/lib/credentials-data'
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
          onRequest={(credential) => setFlow({ kind: 'request', credential })}
        />
      </CredentialSearchScreen>

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
    </>
  )
}
