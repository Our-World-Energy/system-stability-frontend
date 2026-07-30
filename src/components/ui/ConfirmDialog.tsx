import { CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Colors the confirm button and header icon. */
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

/** Small yes/no confirmation dialog built on the shared Modal. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const Icon = tone === 'danger' ? XCircle : CheckCircle2

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            tone === 'danger'
              ? 'bg-critical/15 text-critical-bright'
              : 'bg-primary/15 text-primary-bright',
          )}
        >
          <Icon className="size-5" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              tone === 'danger' && 'bg-critical/80 text-fg hover:bg-critical active:bg-critical',
            )}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-fg-muted text-sm leading-relaxed">{description}</div>}
    </Modal>
  )
}
