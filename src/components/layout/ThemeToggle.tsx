import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/theme'

interface ThemeToggleProps {
  className?: string
}

/** Sun/Moon button that switches between light and dark themes. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-9 shrink-0 place-items-center rounded-lg border transition-colors',
        className,
      )}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
