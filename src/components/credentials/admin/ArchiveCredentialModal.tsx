import { Archive, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { CredentialRecord } from '@/lib/admin-credentials-data'

interface ArchiveCredentialModalProps {
  record: CredentialRecord
  onClose: () => void
  onArchive: () => void
}

/** Confirmation for removing a record from the Requester catalog (reversible). */
export function ArchiveCredentialModal({
  record,
  onClose,
  onArchive,
}: ArchiveCredentialModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Archive Credential"
      icon={
        <span className="border-line-bright text-fg-muted grid size-9 shrink-0 place-items-center rounded-lg border border-dashed">
          <Archive className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onArchive}>
            Archive
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-fg text-sm leading-relaxed">
          Archive{' '}
          <span className="bg-surface-3 text-primary-bright rounded px-1.5 py-0.5 font-mono">
            {record.name}
          </span>{' '}
          ? It will be removed from the Requester catalog immediately.
        </p>
        <div className="border-line bg-surface-2 flex items-start gap-2.5 rounded-lg border p-3">
          <Info className="text-degraded mt-0.5 size-4 shrink-0" />
          <p className="text-fg-muted text-xs leading-relaxed">
            Existing active grants will not be affected until they expire.
          </p>
        </div>
      </div>
    </Modal>
  )
}
