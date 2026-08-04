import { useEffect, useRef, useState } from 'react'
import { MoreVertical, RotateCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Credential } from '@/lib/api/types'

export type RecordAction = 'rotate' | 'purge'

interface RowActionsProps {
  record: Credential
  onAction: (action: RecordAction, record: Credential) => void
}

/** Per-row controls: an inline rotate icon plus an overflow menu. */
export function RowActions({ record, onAction }: RowActionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isArchived = record.status === 'archived'

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
      {/* Archived records can't be rotated. */}
      {!isArchived && (
        <IconButton label="Rotate" onClick={() => run('rotate')}>
          <RotateCw className="size-4" />
        </IconButton>
      )}

      <div ref={ref} className="relative">
        <IconButton label="More actions" onClick={() => setOpen((v) => !v)}>
          <MoreVertical className="size-4" />
        </IconButton>
        {open && (
          <div className="border-line bg-surface-2 absolute top-9 right-0 z-20 w-44 overflow-hidden rounded-lg border py-1 shadow-2xl">
            {!isArchived && (
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
