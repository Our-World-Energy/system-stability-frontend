import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/users-data'
import { RolePill } from './RolePill'

interface ViewUserModalProps {
  user: User
  onClose: () => void
  onEdit: () => void
}

/**
 * Read-only detail view behind the registry's eye action.
 *
 * The designs cover add/edit/delete but not this one, so it reuses the shared
 * dialog shell and shows the same fields the edit form exposes.
 */
export function ViewUserModal({ user, onClose, onEdit }: ViewUserModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={user.name}
      subtitle={user.id}
      className="max-w-lg"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-full font-mono text-xs font-bold">
          {initialsOf(user.name)}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={onEdit}>
            Edit User
          </Button>
        </>
      }
    >
      <dl className="space-y-4">
        <Row label="Email">
          <span className="text-primary-bright font-mono text-[13px]">{user.email}</span>
        </Row>
        <Row label="Phone">
          <span className="text-fg font-mono text-[13px]">{user.phone}</span>
        </Row>
        <Row label="Role">
          <RolePill role={user.role} />
        </Row>
        {/* Org-wide roles carry no department, so these rows only apply to some users. */}
        {user.department && (
          <Row label="Department">
            <span className="text-fg text-sm">{user.department}</span>
          </Row>
        )}
        {user.subDepartment && (
          <Row label="Sub-Department">
            <span className="text-primary-bright font-mono text-[13px]">{user.subDepartment}</span>
          </Row>
        )}
        <Row label="Status">
          <span
            className={cn(
              'font-mono text-xs font-bold uppercase',
              user.status === 'Active' ? 'text-primary-bright' : 'text-degraded',
            )}
          >
            {user.status}
          </span>
        </Row>
      </dl>

      <div className="border-line mt-5 border-t pt-4">
        <dt className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
          Description / Justification
        </dt>
        <dd className="text-fg-muted mt-2 text-sm leading-relaxed">{user.justification || '—'}</dd>
      </div>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-fg-muted font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
