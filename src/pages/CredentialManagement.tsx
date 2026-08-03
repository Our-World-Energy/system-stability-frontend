import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plus, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CredentialSearchScreen } from '@/components/credentials/CredentialSearchScreen'
import { CredentialRecordTable } from '@/components/credentials/admin/CredentialRecordTable'
import type { RecordAction } from '@/components/credentials/admin/RowActions'
import { CreateCredentialModal } from '@/components/credentials/admin/CreateCredentialModal'
import { RotateCredentialModal } from '@/components/credentials/admin/RotateCredentialModal'
import { PurgeCredentialModal } from '@/components/credentials/admin/PurgeCredentialModal'
import { useCredentialSearch } from '@/hooks/useCredentials'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePendingStats } from '@/hooks/useStats'
import { credentialErrorMessage } from '@/lib/api/credentials'
import type { Credential } from '@/lib/api/types'

/** The dialog currently open on the management console. */
type ActiveModal = { kind: 'create' } | { kind: RecordAction; record: Credential } | null

export function CredentialManagement() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ActiveModal>(null)

  // The service has no list-everything route (`q` is required), which suits this
  // screen: it stays on its search hero until something is typed. Debounced so a
  // request follows the typing rather than every keystroke.
  const debounced = useDebouncedValue(query, 300)
  const search = useCredentialSearch(debounced)

  // Badge on the Pending Actions button — the same count the approvals page shows.
  const pendingStats = usePendingStats()
  const totalPending = pendingStats.data?.total_pending ?? 0

  return (
    <>
      <CredentialSearchScreen
        query={query}
        onQueryChange={setQuery}
        subheading="Manage credential records, rotation, and archival. Secrets are never displayed here."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/credentials/admin/logs')}>
              <ScrollText className="size-4" />
              Activity Logs
            </Button>
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
            <Button onClick={() => setModal({ kind: 'create' })}>
              <Plus className="size-4" />
              Add Credential
            </Button>
          </>
        }
      >
        <CredentialRecordTable
          records={search.data ?? []}
          // `isFetching` rather than `isLoading`, so re-running a search after a
          // rotate or delete still reads as "working" instead of "no results".
          loading={search.isFetching}
          error={search.isError ? credentialErrorMessage(search.error, 'Search failed.') : null}
          onAction={(action, record) => setModal({ kind: action, record })}
        />
      </CredentialSearchScreen>

      <CreateCredentialModal
        open={modal?.kind === 'create'}
        onClose={() => setModal(null)}
        // The list is keyed on the search term, and the hook invalidates it — so
        // a new record appears as soon as it matches what is in the box.
        onCreated={() => setModal(null)}
      />

      {modal?.kind === 'rotate' && (
        <RotateCredentialModal record={modal.record} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'purge' && (
        <PurgeCredentialModal record={modal.record} onClose={() => setModal(null)} />
      )}
    </>
  )
}
