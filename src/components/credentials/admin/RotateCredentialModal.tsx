import { useState } from 'react'
import { ChevronDown, RotateCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import type { CredentialRecord } from '@/lib/admin-credentials-data'
import { SecretInput } from './SecretInput'

interface RotateCredentialModalProps {
  record: CredentialRecord
  onClose: () => void
  onRotate: () => void
}

/** Replace a record's secret, with an optional metadata section. */
export function RotateCredentialModal({ record, onClose, onRotate }: RotateCredentialModalProps) {
  const [secret, setSecret] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showMeta, setShowMeta] = useState(false)

  const matches = secret.length > 0 && secret === confirm

  return (
    <Modal
      open
      onClose={onClose}
      title="Rotate Credential"
      subtitle={`${record.name} • Last rotated: ${record.lastRotated ?? 'never'}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => matches && onRotate()} disabled={!matches}>
            <RotateCw className="size-4" />
            Rotate Credential
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="New Secret / Password">
          <SecretInput value={secret} onChange={setSecret} placeholder="••••••••••••••••" />
        </Field>

        <Field label="Confirm New Secret">
          <SecretInput value={confirm} onChange={setConfirm} placeholder="••••••••••••••••" />
        </Field>

        {secret.length > 0 && confirm.length > 0 && !matches && (
          <p className="text-critical-bright font-mono text-xs">Secrets do not match.</p>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowMeta((v) => !v)}
            className="text-fg-muted hover:text-fg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ChevronDown
              className={`size-4 transition-transform ${showMeta ? 'rotate-180' : ''}`}
            />
            Update other details (metadata)
          </button>
          {showMeta && (
            <div className="border-line bg-surface-2 text-fg-muted mt-3 rounded-lg border p-3 text-sm">
              Metadata fields (owner, tags, elevation window) will be editable here once the vault
              API is connected.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
