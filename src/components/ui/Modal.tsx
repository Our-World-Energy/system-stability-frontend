import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Header title. Omit to render a fully custom body via `children` only. */
  title?: React.ReactNode
  /** Accessible label for the dialog when `title` is not a plain string. */
  ariaLabel?: string
  subtitle?: string
  /** Optional leading icon badge shown left of the title. */
  icon?: React.ReactNode
  children: React.ReactNode
  /** Sticky footer (actions). */
  footer?: React.ReactNode
  className?: string
}

/**
 * Centered modal dialog with a dimmed, blurred backdrop. Closes on backdrop
 * click and Escape. The design shell for every Credential Manager dialog.
 */
export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  subtitle,
  icon,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      {/* Scroll wrapper: centers the card, but lets it scroll into view when tall. */}
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'border-line bg-surface relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-2xl',
            className,
          )}
        >
          {title && (
            <header className="border-line flex shrink-0 items-start gap-3 border-b px-5 py-4">
              {icon}
              <div className="min-w-0 flex-1">
                <h2 className="text-fg text-lg leading-tight font-semibold">{title}</h2>
                {subtitle && <p className="text-fg-muted mt-0.5 text-sm">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-fg-muted hover:bg-surface-3 hover:text-fg grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
              >
                <X className="size-5" />
              </button>
            </header>
          )}

          {/* Body scrolls; header/footer stay pinned. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

          {footer && (
            <footer className="border-line flex shrink-0 items-center justify-end gap-3 border-t px-5 py-4">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}
