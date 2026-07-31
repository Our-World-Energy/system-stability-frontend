import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthAlertProps {
  children: React.ReactNode
  tone?: 'error' | 'success'
  className?: string
}

/**
 * Inline banner for form-level outcomes — a rejected sign-in, a mail-send
 * failure, or the "password updated" confirmation carried over to the login page.
 */
export function AuthAlert({ children, tone = 'error', className }: AuthAlertProps) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
        tone === 'error'
          ? 'border-critical/40 bg-critical/10 text-critical-bright'
          : 'border-primary/40 bg-primary/10 text-primary-bright',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** Field-level validation message, sitting directly under its input. */
export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-critical-bright mt-2 text-xs">{children}</p>
}
