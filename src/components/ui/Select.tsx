import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { controlClass } from './Field'

interface SelectProps {
  value: string
  /** Called with the chosen value (not the event), matching the app's controlled pattern. */
  onChange: (value: string) => void
  children: React.ReactNode
  id?: string
  disabled?: boolean
  /** Emerald-mono treatment for the chosen value — used for the User role field. */
  accent?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * The single styled dropdown used across the app's forms.
 *
 * A native `<select>` under the hood — full keyboard and form semantics for free —
 * dressed to match the dark control tokens: a chevron affordance, a hover border,
 * a focus ring, and a muted look while nothing is chosen. The option list is
 * darkened globally in `index.css`, so the whole control reads as one piece.
 */
export function Select({
  value,
  onChange,
  children,
  id,
  disabled,
  accent,
  className,
  ...aria
}: SelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          controlClass,
          'h-11 w-full appearance-none pr-10',
          'hover:border-line-bright disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-fg-subtle',
          accent && value && 'text-primary-bright font-mono',
          className,
        )}
        {...aria}
      >
        {children}
      </select>
      <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  )
}
