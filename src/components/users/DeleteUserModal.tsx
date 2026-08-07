import { useState } from 'react'
import { Trash2, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { UserRecord } from '@/lib/api/user-management.types'

const CONFIRM_WORD = 'DELETE'

interface DeleteUserModalProps {
  user: UserRecord
  onClose: () => void
  onConfirm: () => void
  /** True while delete-user is in flight. */
  pending?: boolean
}

/**
 * Destructive confirmation. De-provisioning stays disabled until the admin types
 * DELETE, so the action can't be triggered by a stray click.
 *
 * The backend does a *soft* delete: the row stays so past credential actions
 * (created_by, requested_by, granted_to, reviewed_by) remain attributed to whoever
 * actually did them. The copy says so rather than claiming the record is gone —
 * adding the same email back later revives this exact account.
 */
export function DeleteUserModal({ user, onClose, onConfirm, pending = false }: DeleteUserModalProps) {
  const [confirmation, setConfirmation] = useState('')
  const armed = confirmation.trim().toUpperCase() === CONFIRM_WORD && !pending

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Delete user"
      className="bg-modal-veil max-w-lg border-[#93000A]"
      footer={
        // Cancel sits to the right of Delete, and is now the only visible way to
        // back out (alongside Escape and the backdrop).
        <>
          <Button
            onClick={() => armed && onConfirm()}
            disabled={!armed}
            className="bg-critical hover:bg-critical/90 active:bg-critical/80 font-semibold text-white"
          >
            <Trash2 className="size-4" />
            {pending ? 'Removing…' : 'Delete'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {/* Bled past the body padding so the header band reaches the card edges. */}
      <header className="-mx-5 -mt-5 mb-5 flex items-center gap-3 border-b border-[#93000A] bg-[#93000A33] px-5 py-4">
        <span className="bg-critical/20 text-critical-bright grid size-10 shrink-0 place-items-center rounded-full">
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-critical-bright text-lg leading-tight font-semibold">Delete User</h2>
          <p className="text-critical-bright/80 mt-0.5 text-[13px] font-semibold">
            Security protocol confirmation required
          </p>
        </div>
      </header>

      <p className="text-fg text-[15px] leading-relaxed">
        Are you sure you want to remove this user? This immediately revokes their access to all
        credentials and stops them signing in. Their past credential activity stays on the audit
        trail, and adding the same email again would restore this account.
      </p>

      {/* Two columns, two rows. Row 1 is pinned to leading-5 on both sides despite the
          differing type sizes, so row 2 (email / status) lands on a shared baseline. */}
      <div className="border-line-bright/70 mt-5 flex items-start justify-between gap-4 rounded-lg border border-dashed p-3">
        <div className="min-w-0">
          <p className="text-fg truncate text-sm leading-5 font-semibold">{user.full_name}</p>
          <p className="text-fg-muted mt-0.5 truncate font-mono text-xs leading-4">{user.email}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-fg-subtle font-mono text-[10px] leading-5 tracking-[0.08em] uppercase">
            Role
          </p>
          <p
            className={cn(
              'mt-0.5 font-mono text-xs leading-4 font-bold uppercase',
              user.status === 'active' ? 'text-primary-bright' : 'text-degraded',
            )}
          >
            {user.role.name}
          </p>
        </div>
      </div>

      <label htmlFor="delete-confirm" className="text-fg mt-5 block text-[13px] font-semibold">
        Type <span className="text-critical-bright">{CONFIRM_WORD}</span> to confirm
        de-provisioning
      </label>
      <input
        id="delete-confirm"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        // Enter confirms, so the whole thing is type-then-return without reaching
        // for the mouse. It can only fire once DELETE has been typed in full —
        // `armed` also covers the in-flight case, so a second Enter cannot send a
        // second request. The dialog body is not a <form> (the footer lives outside
        // it in Modal), so there is no implicit submission to rely on.
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (armed) onConfirm()
        }}
        // The caret starts here: typing the confirmation is the only thing to do in
        // this dialog, and it saves a click before the keyboard path above works.
        autoFocus
        autoComplete="off"
        placeholder="ENTER CONFIRMATION STRING"
        className="border-line-bright bg-input text-fg placeholder:text-fg-subtle focus:border-critical focus:ring-critical/20 mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm tracking-[0.08em] uppercase transition-colors outline-none focus:ring-2"
      />
    </Modal>
  )
}
