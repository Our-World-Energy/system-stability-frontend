import { cn } from '@/lib/utils'

type Variant = 'primary' | 'cta' | 'ghost' | 'outline'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-canvas font-semibold hover:bg-primary-bright active:bg-primary-dim',
  // The bright mint call-to-action from the designs: sign-in, create user, save.
  // Its deep-green label and the stepped-down hover/active mints are sampled
  // values with no token of their own.
  cta: 'bg-primary-bright font-bold text-[#005E2D] hover:bg-[#66E7AF] active:bg-[#5DD3A0]',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-3',
  outline: 'border border-line-bright text-fg hover:bg-surface-3',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** Compact button following the dark token system; defaults to the emerald primary. */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm',
        'focus-visible:ring-primary/30 transition-colors outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
