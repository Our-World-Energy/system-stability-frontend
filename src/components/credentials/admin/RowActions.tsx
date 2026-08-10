import { RotateCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Credential } from '@/lib/api/types'

export type RecordAction = 'rotate' | 'request-rotation' | 'purge'

/** Which per-row actions the signed-in role may take. Decided by the page. */
export interface RecordPermissions {
  /** Rotate the secret directly (org admin). */
  rotate: boolean
  /** Propose a new secret for an admin to apply (executive user). */
  requestRotation: boolean
  /** Hard-delete the record (org admin). */
  purge: boolean
}

interface RowActionsProps {
  record: Credential
  permissions: RecordPermissions
  onAction: (action: RecordAction, record: Credential) => void
}

/**
 * Per-row controls, gated by role, each a single inline icon: rotate (org admin)
 * or request-rotation (executive), and purge (org admin). Archived records offer
 * neither rotation. Purge opens a confirmation dialog, so its icon is not a
 * one-click delete.
 */
export function RowActions({ record, permissions, onAction }: RowActionsProps) {
  const isArchived = record.status === 'archived'
  const showRotate = permissions.rotate && !isArchived
  const showRequestRotation = permissions.requestRotation && !isArchived

  const run = (action: RecordAction) => onAction(action, record)

  return (
    <div className="flex items-center justify-end gap-1">
      {showRotate && (
        <IconButton label="Rotate" onClick={() => run('rotate')}>
          <RotateCw className="size-4" />
        </IconButton>
      )}
      {showRequestRotation && (
        <IconButton label="Request Rotation" onClick={() => run('request-rotation')}>
          <RotateCw className="size-4" />
        </IconButton>
      )}
      {permissions.purge && (
        <IconButton label="Purge Record" destructive onClick={() => run('purge')}>
          <Trash2 className="size-4" />
        </IconButton>
      )}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors',
        destructive
          ? 'text-critical-bright hover:bg-critical/10'
          : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
