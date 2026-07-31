import { cn } from '@/lib/utils'

/** Shared input/select/textarea styling for the dark form controls. */
export const controlClass =
  'w-full rounded-lg border border-line bg-input px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/20'

interface FieldProps {
  label: string
  children: React.ReactNode
  /** Optional accent on the label (e.g. the "required" beneficiary block). */
  accent?: boolean
  /** `id` of the control this labels, so clicking the caption focuses it. */
  htmlFor?: string
  /** Appends the emerald asterisk the designs use to mark mandatory fields. */
  required?: boolean
  className?: string
}

/** Labeled form-field wrapper with the mono uppercase caption used across modals. */
export function Field({ label, children, accent, htmlFor, required, className }: FieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
          accent ? 'text-primary-bright' : 'text-fg-muted',
        )}
      >
        {label}
        {/* Decorative: a bare "*" read aloud is noise, and it would otherwise end up
            in the control's accessible name. */}
        {required && (
          <span aria-hidden className="text-primary-bright ml-1.5">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}
