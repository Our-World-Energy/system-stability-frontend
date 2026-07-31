import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Leading glyph, e.g. `Mail` or `Lock`. */
  icon: React.ComponentType<{ className?: string }>
  /** Slot pinned to the right edge — the password reveal toggle. */
  trailing?: React.ReactNode
}

/** Tall auth-form input: shared dark control styling plus a leading icon. */
export function AuthInput({ icon: Icon, trailing, className, ...props }: AuthInputProps) {
  return (
    <div className="relative">
      <Icon className="text-fg-subtle pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2" />
      <input
        className={cn(controlClass, 'h-12 pl-11', trailing ? 'pr-12' : 'pr-3.5', className)}
        {...props}
      />
      {trailing && <div className="absolute top-1/2 right-2.5 -translate-y-1/2">{trailing}</div>}
    </div>
  )
}

type PasswordInputProps = Omit<AuthInputProps, 'icon' | 'trailing' | 'type'>

/** Password field with the lock glyph and a show/hide eye toggle. */
export function PasswordInput(props: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <AuthInput
      icon={Lock}
      type={revealed ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className="text-fg-muted hover:text-fg focus-visible:ring-primary/30 grid size-8 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2"
        >
          {revealed ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
      {...props}
    />
  )
}
