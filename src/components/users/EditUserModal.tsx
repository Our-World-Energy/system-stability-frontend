import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  buildUpdateUserPayload,
  describeUserFormGap,
  formValuesFromUser,
  type UserFormValues,
} from '@/lib/api/user-payload'
import type {
  MetadataData,
  UpdateUserRequest,
  UserRecord,
} from '@/lib/api/user-management.types'
import { UserFormFields } from './UserFormFields'

interface EditUserModalProps {
  user: UserRecord
  onClose: () => void
  onSave: (payload: UpdateUserRequest) => void
  metadata: MetadataData
  /** True while update-user is in flight. */
  pending?: boolean
}

/**
 * Edit form for an existing user, pre-filled from the registry row.
 *
 * update-user is a full replace rather than a patch, so the payload carries the
 * whole record every time. `formValuesFromUser` seeds only the scope the row's
 * current role actually uses, and the payload builder rebuilds scope from whatever
 * role is selected at save time — together that means changing someone's role
 * cannot leave their old department or platforms attached.
 */
export function EditUserModal({
  user,
  onClose,
  onSave,
  metadata,
  pending = false,
}: EditUserModalProps) {
  const [form, setForm] = useState<UserFormValues>(() => formValuesFromUser(user))

  const patch = (next: Partial<UserFormValues>) => setForm((f) => ({ ...f, ...next }))
  // Matches the locked email control in the form — see UserFormFields.
  const gap = describeUserFormGap(form, { emailLocked: true })

  const submit = () => {
    if (gap || pending) return
    onSave(buildUpdateUserPayload(user.id, form))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit System User"
      // The emerald outline is the design's cue that this dialog mutates a record.
      className="border-primary/70 max-w-2xl"
      footer={
        // No Cancel — the dialog's own close control (and Escape) backs out.
        <Button variant="cta" onClick={submit} disabled={Boolean(gap) || pending}>
          {pending ? 'Saving…' : 'Save Changes'}
        </Button>
      }
    >
      {/* The form renders its own validation messages; `gap` only gates Save. */}
      <UserFormFields form={form} onChange={patch} metadata={metadata} variant="edit" />
    </Modal>
  )
}
