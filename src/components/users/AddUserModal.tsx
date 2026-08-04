import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { emptyUserDraft, isUserDraftComplete, type UserDraft } from '@/lib/user-draft'
import { UserFormFields } from './UserFormFields'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onCreate: (draft: UserDraft) => void
}

/** Provisioning form for a brand-new system user. */
export function AddUserModal({ open, onClose, onCreate }: AddUserModalProps) {
  const [draft, setDraft] = useState<UserDraft>(emptyUserDraft)

  if (!open) return null

  const patch = (next: Partial<UserDraft>) => setDraft((d) => ({ ...d, ...next }))

  const submit = () => {
    if (!isUserDraftComplete(draft)) return
    onCreate(draft)
    setDraft(emptyUserDraft) // Reset, so reopening starts blank.
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add New User"
      className="max-w-2xl"
      icon={<UserPlus className="text-primary-bright mt-0.5 size-5 shrink-0" />}
      footer={
        <Button variant="cta" onClick={submit} disabled={!isUserDraftComplete(draft)}>
          <Plus className="size-4" />
          Create User
        </Button>
      }
    >
      <UserFormFields draft={draft} onChange={patch} variant="create" />

      {/* `mt-5` and an even `p-3` keep the note on the form's own spacing scale —
          20px between blocks, 12px inside a box — instead of 24px / 14px-by-12px. */}
      <p className="border-line-bright/70 text-fg-muted mt-5 rounded-lg border border-dashed p-3 text-[13px] leading-relaxed">
        <span className="text-primary-bright font-semibold">NOTE:</span> Adding a new system user
        automatically triggers an invitation. The link will be sent to the registered email address.
      </p>
    </Modal>
  )
}
