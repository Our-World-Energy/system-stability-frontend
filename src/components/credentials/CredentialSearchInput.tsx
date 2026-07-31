import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('relative', className)}>
      <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border pr-4 pl-10 font-mono text-sm transition-colors outline-none focus:ring-2"
      />
    </div>
  )
}
