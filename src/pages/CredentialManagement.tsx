import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plus, ScrollText, Search } from 'lucide-react'
import { credentialRecords, type CredentialRecord } from '@/lib/admin-credentials-data'
import { approvalStats } from '@/lib/pending-approvals-data'
import { Button } from '@/components/ui/Button'
import { CredentialRecordTable } from '@/components/credentials/admin/CredentialRecordTable'
import type { RecordAction } from '@/components/credentials/admin/RowActions'
import { CreateCredentialModal } from '@/components/credentials/admin/CreateCredentialModal'
import { RotateCredentialModal } from '@/components/credentials/admin/RotateCredentialModal'
import { ArchiveCredentialModal } from '@/components/credentials/admin/ArchiveCredentialModal'
import { PurgeCredentialModal } from '@/components/credentials/admin/PurgeCredentialModal'

/** The dialog currently open on the management console. */
type ActiveModal = { kind: 'create' } | { kind: RecordAction; record: CredentialRecord } | null

export function CredentialManagement() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ActiveModal>(null)

  const hasQuery = query.trim().length > 0

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return credentialRecords.filter((r) => r.name.toLowerCase().includes(q))
  }, [query])

  // Where the vault-admin mutations (create / rotate / archive / purge) will be
  // dispatched once the API is wired. For now each simply closes the dialog.
  const commit = () => setModal(null)

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Credential Management</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Manage credential records, rotation, and archival. Secrets are never displayed here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            {approvalStats.totalPending > 0 && (
              <span className="bg-critical ring-canvas absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] font-bold text-white ring-2">
                {approvalStats.totalPending > 99 ? '99+' : approvalStats.totalPending}
              </span>
            )}
          </Button>
          <Button onClick={() => setModal({ kind: 'create' })}>
            <Plus className="size-4" />
            Add Credential
          </Button>
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
        <CredentialRecordTable
          records={visible}
          onAction={(action, record) => setModal({ kind: action, record })}
        />
      ) : (
        <EmptyState />
      )}

      <CreateCredentialModal
        open={modal?.kind === 'create'}
        onClose={() => setModal(null)}
        onCreate={commit}
      />

      {modal?.kind === 'rotate' && (
        <RotateCredentialModal
          record={modal.record}
          onClose={() => setModal(null)}
          onRotate={commit}
        />
      )}
      {modal?.kind === 'archive' && (
        <ArchiveCredentialModal
          record={modal.record}
          onClose={() => setModal(null)}
          onArchive={commit}
        />
      )}
      {modal?.kind === 'purge' && (
        <PurgeCredentialModal
          record={modal.record}
          onClose={() => setModal(null)}
          onPurge={commit}
        />
      )}
    </div>
  )
}

/** Shown before the admin has typed a query — records stay hidden by default. */
function EmptyState() {
  return (
    <div className="border-line grid place-items-center rounded-lg border border-dashed py-20 text-center">
      <Search className="text-fg-subtle size-8" />
      <p className="text-fg mt-4 text-sm font-medium">Enter a credential name to begin</p>
      <p className="text-fg-muted mt-1 text-sm">
        Search the vault to view, rotate, or archive a credential record.
      </p>
    </div>
  )
}
