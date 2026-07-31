import { cn } from '@/lib/utils'

type Variant = 'primary' | 'cta' | 'ghost' | 'outline'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-canvas font-semibold hover:bg-primary-bright active:bg-primary-dim',
  // Call-to-action: sign-in, create user, save. Brand green at rest, brightening
  // on hover; the pressed mint is a chosen value with no token of its own. The
  // label is a fixed near-black rather than `text-canvas`, because that token
  // flips to a light grey under the light theme and would vanish on the green.
  cta: 'bg-primary font-bold text-black hover:bg-primary-bright active:bg-[#5DD3A0]',
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
