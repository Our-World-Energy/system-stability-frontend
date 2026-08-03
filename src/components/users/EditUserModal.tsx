import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { User } from '@/lib/users-data'
import { isUserDraftComplete, type UserDraft } from '@/lib/user-draft'
import { UserFormFields } from './UserFormFields'

interface EditUserModalProps {
  user: User
  onClose: () => void
  onSave: (draft: UserDraft) => void
}

/** Edit form for an existing user, pre-filled from the registry row. */
export function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [draft, setDraft] = useState<UserDraft>({
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    department: user.department,
    subDepartment: user.subDepartment,
    platforms: [...user.platforms],
    justification: user.justification,
  })

  const patch = (next: Partial<UserDraft>) => setDraft((d) => ({ ...d, ...next }))

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit System User"
      // The emerald outline is the design's cue that this dialog mutates a record.
      className="border-primary/70 max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={() => isUserDraftComplete(draft) && onSave(draft)}
            disabled={!isUserDraftComplete(draft)}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <UserFormFields draft={draft} onChange={patch} variant="edit" />
    </Modal>
  )
}
