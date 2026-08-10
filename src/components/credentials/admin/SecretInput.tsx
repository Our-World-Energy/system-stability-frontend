import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { controlClass } from '@/components/ui/Field'

interface SecretInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

/** Password-style input with a show/hide toggle for entering secret values. */
export function SecretInput({
  value,
  onChange,
  placeholder,
  className,
  id,
  disabled,
}: SecretInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        // Browsers offer to save anything they think is a password; a vault
        // secret typed by an admin is the last thing that should land in one.
        autoComplete="new-password"
        spellCheck={false}
        className={cn(
          controlClass,
          'h-11 pr-10 font-mono disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Hide secret' : 'Show secret'}
        className="text-fg-subtle hover:text-fg absolute top-1/2 right-3 -translate-y-1/2 transition-colors disabled:cursor-not-allowed"
      >
        {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
    </div>
  )
}
