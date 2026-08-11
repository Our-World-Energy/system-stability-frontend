import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

// ComponentPropsWithRef rather than InputHTMLAttributes so a caller can hold a ref
// to the underlying input — the login form needs one to put focus back on the
// password box after a rejected attempt.
interface AuthInputProps extends React.ComponentPropsWithRef<'input'> {
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

/**
 * Password field with the lock glyph and a hold-to-reveal eye.
 *
 * The eye is a momentary control, not a toggle: the password is legible only while
 * the button is actually held down, and re-hides the instant the pointer is
 * released, moves off the button, or focus goes elsewhere. A toggle can be left
 * switched on and forgotten, which is how a password ends up sitting in clear text
 * on a screen someone walks away from — or on a shared one.
 *
 * Pointer events rather than mouse events, so press-and-hold works the same with a
 * finger or a stylus. Keyboard users get the same behaviour from Enter/Space, which
 * reveal on key-down and hide on key-up.
 */
export function PasswordInput(props: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false)
  const show = () => setRevealed(true)
  const hide = () => setRevealed(false)

  /** Enter and Space are what activates a button; other keys must not reveal. */
  const isActivationKey = (key: string) => key === 'Enter' || key === ' ' || key === 'Spacebar'

  return (
    <AuthInput
      icon={Lock}
      type={revealed ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          // Holding the eye should not pull the caret out of the field being typed
          // into, so the press is prevented from moving focus. Tab still reaches
          // the button, which is what the key handlers below are for.
          onPointerDown={(e) => {
            e.preventDefault()
            show()
          }}
          onPointerUp={hide}
          onPointerLeave={hide}
          onPointerCancel={hide}
          // Backstop: a window switch mid-hold can swallow the release.
          onBlur={hide}
          onKeyDown={(e) => {
            if (!isActivationKey(e.key)) return
            e.preventDefault() // Space would otherwise scroll the page.
            show()
          }}
          onKeyUp={(e) => {
            if (isActivationKey(e.key)) hide()
          }}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          title="Hold to show password"
          className="text-fg-muted hover:text-fg focus-visible:ring-primary/30 grid size-8 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2"
        >
          {/* The glyph shows the current state, not the action: struck through
              while the password is hidden, open while it is legible. Same way
              round as the credential manager's secret field. */}
          {revealed ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
        </button>
      }
      {...props}
    />
  )
}
