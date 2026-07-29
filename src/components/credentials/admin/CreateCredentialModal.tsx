import { useState } from 'react'
import { ChevronDown, KeyRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { twoFactorApprovers, twoFactorTypes } from '@/lib/admin-credentials-data'
import { SecretInput } from './SecretInput'

interface CreateCredentialModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

/** Form for registering a new credential record with an initial write-only secret. */
export function CreateCredentialModal({ open, onClose, onCreate }: CreateCredentialModalProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [secret, setSecret] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [twoFactorType, setTwoFactorType] = useState<string>(twoFactorTypes[0])
  const [twoFactorApprover, setTwoFactorApprover] = useState<string>(twoFactorApprovers[0])

  const canCreate = name.trim().length > 0 && secret.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Credential"
      subtitle="Enter metadata and initial secret value. The secret will be write-only."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => canCreate && onCreate(name)} disabled={!canCreate}>
            <KeyRound className="size-4" />
            Create Credential
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Credential Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production DB Key"
              className={cn(controlClass, 'h-11')}
            />
          </Field>
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin_svc_prod"
              className={cn(controlClass, 'h-11 font-mono')}
            />
          </Field>
        </div>

        <Field label="Secret / Password">
          <SecretInput value={secret} onChange={setSecret} placeholder="••••••••••••••••" />
        </Field>

        <Field label="URL">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://db-cluster-01.internal.net"
            className={cn(controlClass, 'h-11 font-mono')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="2FA Type">
            <SelectControl value={twoFactorType} onChange={setTwoFactorType}>
              {twoFactorTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field label="2FA Approver">
            <SelectControl value={twoFactorApprover} onChange={setTwoFactorApprover}>
              {twoFactorApprovers.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectControl>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional context regarding access rotation policies…"
            className={cn(controlClass, 'resize-none py-2.5')}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** Native select styled to match the dark form controls, with a chevron affordance. */
function SelectControl({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, 'h-11 appearance-none pr-10')}
      >
        {children}
      </select>
      <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  )
}
