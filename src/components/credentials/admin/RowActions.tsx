import { useEffect, useRef, useState } from 'react'
import { MoreVertical, RotateCw, Trash2 } from 'lucide-react'
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
 * Per-row controls, gated by role. The org admin sees the direct rotate icon plus
 * an overflow menu (rotate + purge); a request-only role (executive) sees a single
 * "Request Rotation" icon and no menu. Archived records offer neither rotation.
 */
export function RowActions({ record, permissions, onAction }: RowActionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isArchived = record.status === 'archived'

  const showRotate = permissions.rotate && !isArchived
  const showRequestRotation = permissions.requestRotation && !isArchived
  // Purge is the only menu-only action, so the overflow menu exists only for it.
  const showMenu = permissions.purge

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const run = (action: RecordAction) => {
    setOpen(false)
    onAction(action, record)
  }

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

      {showMenu && (
        <div ref={ref} className="relative">
          <IconButton label="More actions" onClick={() => setOpen((v) => !v)}>
            <MoreVertical className="size-4" />
          </IconButton>
          {open && (
            <div className="border-line bg-surface-2 absolute top-9 right-0 z-20 w-44 overflow-hidden rounded-lg border py-1 shadow-2xl">
              {showRotate && (
                <MenuItem onClick={() => run('rotate')}>
                  <RotateCw className="size-4" />
                  Rotate Credential
                </MenuItem>
              )}
              <MenuItem onClick={() => run('purge')} destructive>
                <Trash2 className="size-4" />
                Purge Record
              </MenuItem>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-fg-muted hover:bg-surface-3 hover:text-fg grid size-8 place-items-center rounded-lg transition-colors"
    >
      {children}
    </button>
  )
}

function MenuItem({
  onClick,
  destructive,
  children,
}: {
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        destructive
          ? 'text-critical-bright hover:bg-critical/10'
          : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
