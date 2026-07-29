import { cn } from '@/lib/utils'

/** Shared input/select/textarea styling for the dark form controls. */
export const controlClass =
  'w-full rounded-lg border border-line bg-input px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/20'

interface FieldProps {
  label: string
  children: React.ReactNode
  /** Optional accent on the label (e.g. the "required" beneficiary block). */
  accent?: boolean
  className?: string
}

/** Labeled form-field wrapper with the mono uppercase caption used across modals. */
export function Field({ label, children, accent, className }: FieldProps) {
  return (
    <div className={className}>
      <label
        className={cn(
          'mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
          accent ? 'text-primary-bright' : 'text-fg-muted',
        )}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
