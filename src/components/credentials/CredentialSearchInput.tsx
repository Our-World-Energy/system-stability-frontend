import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn, stripLeadingWhitespace } from '@/lib/utils'

interface CredentialSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

/** Shared search field for the credential catalog and management consoles. */
export function CredentialSearchInput({
  value,
  onChange,
  placeholder = 'Search credentials by name…',
  className,
  autoFocus,
}: CredentialSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.length > 0

  const clear = () => {
    onChange('')
    // Keep the caret in the box so the user can retype straight away.
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        ref={inputRef}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(stripLeadingWhitespace(e.target.value))}
        placeholder={placeholder}
        className={cn(
          'border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border pl-10 font-mono text-sm transition-colors outline-none focus:ring-2',
          hasValue ? 'pr-11' : 'pr-4',
        )}
      />
      {hasValue && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          title="Clear search"
          className="text-fg-subtle hover:bg-surface-3 hover:text-fg absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-md transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
