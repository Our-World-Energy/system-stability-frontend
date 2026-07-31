import { Link } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AuthSubmitProps {
  children: React.ReactNode
  /** Request in flight — swaps the icon for a spinner and blocks re-submits. */
  pending?: boolean
  disabled?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

/** Full-width primary action: the bright mint bar at the foot of every auth card. */
export function AuthSubmit({ children, pending, disabled, icon: Icon = LogIn }: AuthSubmitProps) {
  return (
    <Button
      type="submit"
      variant="cta"
      disabled={pending || disabled}
      className="h-12 w-full text-[15px]"
    >
      {children}
      {pending ? (
        <LoaderCircle className="size-[18px] animate-spin" />
      ) : (
        <Icon className="size-[18px]" />
      )}
    </Button>
  )
}

/** Mono text link used for the secondary routes under the primary action. */
export function AuthLink({
  to,
  children,
  icon: Icon,
  accent,
  className,
}: {
  to: string
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** Emerald instead of the default off-white — used by "Forgot Password?". */
  accent?: boolean
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'focus-visible:ring-primary/30 inline-flex items-center gap-2 rounded font-mono text-[13px] transition-colors outline-none focus-visible:ring-2',
        accent ? 'text-primary-bright hover:text-primary' : 'text-fg hover:text-primary-bright',
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  )
}

/** "← Back to Login", centred beneath the card's primary action. */
export function BackToLogin() {
  return (
    <div className="mt-7 flex justify-center">
      <AuthLink to="/login" icon={ArrowLeft}>
        Back to Login
      </AuthLink>
    </div>
  )
}
