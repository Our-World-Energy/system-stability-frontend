import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plus, ScrollText } from 'lucide-react'
import { credentialRecords, type CredentialRecord } from '@/lib/admin-credentials-data'
import { approvalStats } from '@/lib/pending-approvals-data'
import { Button } from '@/components/ui/Button'
import { CredentialSearchScreen } from '@/components/credentials/CredentialSearchScreen'
import { CredentialRecordTable } from '@/components/credentials/admin/CredentialRecordTable'
import type { RecordAction } from '@/components/credentials/admin/RowActions'
import { CreateCredentialModal } from '@/components/credentials/admin/CreateCredentialModal'
import { RotateCredentialModal } from '@/components/credentials/admin/RotateCredentialModal'
import { PurgeCredentialModal } from '@/components/credentials/admin/PurgeCredentialModal'

/** The dialog currently open on the management console. */
type ActiveModal = { kind: 'create' } | { kind: RecordAction; record: CredentialRecord } | null

export function CredentialManagement() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ActiveModal>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return credentialRecords.filter((r) => r.name.toLowerCase().includes(q))
  }, [query])

  // Where the vault-admin mutations (create / rotate / archive / purge) will be
  // dispatched once the API is wired. For now each simply closes the dialog.
  const commit = () => setModal(null)

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
          </>
        }
      >
        <CredentialRecordTable
          records={visible}
          onAction={(action, record) => setModal({ kind: action, record })}
        />
      </CredentialSearchScreen>

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
      {modal?.kind === 'purge' && (
        <PurgeCredentialModal
          record={modal.record}
          onClose={() => setModal(null)}
          onPurge={commit}
        />
      )}
    </>
  )
}
