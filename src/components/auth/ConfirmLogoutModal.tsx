import { LogOut } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ConfirmLogoutModalProps {
  onClose: () => void
  onConfirm: () => void
  /** Address of the session being ended, so it is clear whose it is. */
  email?: string | null
}

/**
 * Confirmation for signing out.
 *
 * Sign-out is one click away in the sidebar of every page, next to navigation
 * links — easy to hit by accident, and the cost is losing whatever is half-typed
 * on screen plus a full sign-in to get back. Cheap to confirm, so it is confirmed.
 */
export function ConfirmLogoutModal({ onClose, onConfirm, email }: ConfirmLogoutModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Log out?"
      ariaLabel="Confirm log out"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-10 shrink-0 place-items-center rounded-full">
          <LogOut className="size-5" />
        </span>
      }
      className="max-w-sm"
      footer={
        // Action first, Cancel second — the same order as every other dialog here.
        <>
          {/* Focused on open, so Enter confirms and Escape (handled by Modal) backs
              out. Nothing else in this dialog wants the caret. */}
          <Button variant="cta" onClick={onConfirm} autoFocus>
            <LogOut className="size-4" />
            Log out
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="text-fg text-[15px] leading-relaxed">
        Are you sure you want to log out
        {email ? (
          <>
            {' of '}
            <span className="text-primary-bright font-mono text-sm">{email}</span>
          </>
        ) : null}
        ? You will need to sign in again to get back to the dashboard.
      </p>
    </Modal>
  )
}
