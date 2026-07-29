import { useState } from 'react'
import { AlertTriangle, Database } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { ENCRYPTION_SCHEME, type CredentialRecord } from '@/lib/admin-credentials-data'

interface PurgeCredentialModalProps {
  record: CredentialRecord
  onClose: () => void
  onPurge: () => void
}

/** Irreversible deletion, gated behind typing the exact record name. */
export function PurgeCredentialModal({ record, onClose, onPurge }: PurgeCredentialModalProps) {
  const [confirmation, setConfirmation] = useState('')
  const confirmed = confirmation === record.name

  return (
    <Modal
      open
      onClose={onClose}
      title="Permanently Purge Record"
      icon={<AlertTriangle className="text-critical-bright mt-0.5 size-5 shrink-0" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => confirmed && onPurge()}
            disabled={!confirmed}
            className="bg-critical/80 text-fg hover:bg-critical active:bg-critical"
          >
            Confirm Purge
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="border-critical bg-critical/5 rounded-lg border-l-2 px-3 py-2.5">
          <p className="text-critical-bright text-sm leading-relaxed">
            This cannot be undone. Encrypted data will be irreversibly deleted.
          </p>
        </div>

        <p className="text-fg text-sm leading-relaxed">
          Instruction: Type the credential name{' '}
          <span className="bg-surface-3 text-fg rounded px-1.5 py-0.5 font-mono">
            {record.name}
          </span>{' '}
          to confirm
        </p>

        <Field label="Confirmation String">
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Enter credential name"
            className={cn(controlClass, 'h-11 font-mono')}
          />
        </Field>

        <div className="border-line-bright flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-3">
            <Database className="text-fg-muted size-5 shrink-0" />
            <div>
              <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
                Target Record
              </p>
              <p className="text-primary-bright font-mono text-sm">{record.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
              Encryption
            </p>
            <p className="text-fg font-mono text-sm">{ENCRYPTION_SCHEME}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
