import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  buildCreateUserPayload,
  describeUserFormGap,
  emptyUserForm,
  type UserFormValues,
} from '@/lib/api/user-payload'
import type { CreateUserRequest, MetadataData } from '@/lib/api/user-management.types'
import { UserFormFields } from './UserFormFields'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onCreate: (payload: CreateUserRequest) => void
  metadata: MetadataData
  /** True while create-user is in flight. */
  pending?: boolean
}

/**
 * Provisioning form for a brand-new system user.
 *
 * Hands its parent a finished create-user payload rather than raw form state, so
 * the role-driven scope rules are applied in exactly one place. There is no
 * password field: the backend generates the initial one and the account comes back
 * with `must_change_password: true`.
 */
export function AddUserModal({
  open,
  onClose,
  onCreate,
  metadata,
  pending = false,
}: AddUserModalProps) {
  const [form, setForm] = useState<UserFormValues>(emptyUserForm)

  if (!open) return null

  const patch = (next: Partial<UserFormValues>) => setForm((f) => ({ ...f, ...next }))
  const gap = describeUserFormGap(form)

  const submit = () => {
    if (gap || pending) return
    onCreate(buildCreateUserPayload(form))
    setForm(emptyUserForm) // Reset, so reopening starts blank.
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add New User"
      className="max-w-2xl"
      icon={<UserPlus className="text-primary-bright mt-0.5 size-5 shrink-0" />}
      footer={
        <Button variant="cta" onClick={submit} disabled={Boolean(gap) || pending}>
          <Plus className="size-4" />
          {pending ? 'Creating…' : 'Create User'}
        </Button>
      }
    >
      <UserFormFields form={form} onChange={patch} metadata={metadata} variant="create" />

      {/* Says what is still missing instead of leaving a disabled button unexplained. */}
      {gap && <p className="text-fg-subtle mt-4 text-[13px]">{gap}</p>}

      {/* `mt-5` and an even `p-3` keep the note on the form's own spacing scale —
          20px between blocks, 12px inside a box — instead of 24px / 14px-by-12px. */}
      <p className="border-line-bright/70 text-fg-muted mt-5 rounded-lg border border-dashed p-3 text-[13px] leading-relaxed">
        <span className="text-primary-bright font-semibold">NOTE:</span> The account is created with
        a temporary password and must be changed on first sign-in. Outside production no welcome
        email is sent, so the password has to be shared directly.
      </p>
    </Modal>
  )
}
