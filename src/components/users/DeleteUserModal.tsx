import { useState } from 'react'
import { Trash2, TriangleAlert, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/users-data'

const CONFIRM_WORD = 'DELETE'

interface DeleteUserModalProps {
  user: User
  onClose: () => void
  onConfirm: () => void
}

/**
 * Destructive confirmation. De-provisioning stays disabled until the admin types
 * DELETE, so the action can't be triggered by a stray click.
 */
export function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  const [confirmation, setConfirmation] = useState('')
  const armed = confirmation.trim().toUpperCase() === CONFIRM_WORD

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Delete user"
      className="bg-modal-veil max-w-lg border-[#93000A]"
      footer={
        // No Cancel — the header's close control (and Escape) backs out.
        <Button
          onClick={() => armed && onConfirm()}
          disabled={!armed}
          className="bg-critical text-white hover:bg-critical/90 active:bg-critical/80 font-semibold"
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      }
    >
      {/* Bled past the body padding so the header band reaches the card edges. */}
      <header className="-mx-5 -mt-5 mb-5 flex items-center gap-3 border-b border-[#93000A] bg-[#93000A33] px-5 py-4">
        <span className="bg-critical/20 text-critical-bright grid size-10 shrink-0 place-items-center rounded-full">
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-critical-bright text-lg leading-tight font-semibold">Delete User</h2>
          <p className="text-critical-bright/80 mt-0.5 text-[13px] font-semibold">
            Security protocol confirmation required
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-critical-bright/70 hover:bg-critical/20 hover:text-critical-bright grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
        >
          <X className="size-5" />
        </button>
      </header>

      <p className="text-fg text-[15px] leading-relaxed">
        Are you sure you want to remove this user? This action will immediately revoke all
        credential access and archive the identity profile.
      </p>

      {/* Two columns, two rows. Row 1 is pinned to leading-5 on both sides despite the
          differing type sizes, so row 2 (id / status) lands on a shared baseline. */}
      <div className="border-line-bright/70 mt-5 flex items-start justify-between gap-4 rounded-lg border border-dashed p-3">
        <div className="min-w-0">
          <p className="text-fg truncate text-sm leading-5 font-semibold">{user.name}</p>
          <p className="text-fg-muted mt-0.5 font-mono text-xs leading-4">{user.id}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-fg-subtle font-mono text-[10px] leading-5 tracking-[0.08em] uppercase">
            Status
          </p>
          <p
            className={cn(
              'mt-0.5 font-mono text-xs leading-4 font-bold uppercase',
              user.status === 'Active' ? 'text-primary-bright' : 'text-degraded',
            )}
          >
            {user.status}
          </p>
        </div>
      </div>

      <label htmlFor="delete-confirm" className="text-fg mt-5 block text-[13px] font-semibold">
        Type <span className="text-critical-bright">{CONFIRM_WORD}</span> to confirm permanent
        de-provisioning
      </label>
      <input
        id="delete-confirm"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        autoComplete="off"
        placeholder="ENTER CONFIRMATION STRING"
        className="border-line-bright bg-input text-fg placeholder:text-fg-subtle focus:border-critical focus:ring-critical/20 mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm tracking-[0.08em] uppercase transition-colors outline-none focus:ring-2"
      />
    </Modal>
  )
}
