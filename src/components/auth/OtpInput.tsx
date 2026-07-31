import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  /** Digits entered so far; shorter than `length` while incomplete. */
  value: string
  onChange: (value: string) => void
  /** Fired once the final box is filled, so the form can auto-submit. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  /** Paints every box red — the code was rejected. */
  invalid?: boolean
}

/**
 * Segmented one-time-code entry. Each digit is its own box, split into two groups
 * by a dash. Typing advances, Backspace retreats, and pasting a full code fills
 * every box at once.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('')
  const half = Math.ceil(length / 2)

  const focusBox = (index: number) =>
    refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus()

  const commit = (next: string) => {
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return

    // A paste (or a fast multi-key burst) fills this box and everything after it.
    const chars = [...value.padEnd(index, ' ')]
    for (let i = 0; i < typed.length && index + i < length; i++) chars[index + i] = typed[i]
    const next = chars.join('').replace(/ /g, '').slice(0, length)

    commit(next)
    focusBox(index + typed.length)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        // Clear this box in place; only step back once it is already empty.
        commit(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index))
        focusBox(index - 1)
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(index + 1)
    }
  }

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 sm:gap-3">
          {i === half && <span className="text-fg-subtle -mx-0.5 select-none">–</span>}
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            value={digits[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1} of ${length}`}
            className={cn(
              'bg-input text-fg h-14 w-11 rounded-lg border text-center font-mono text-xl',
              'transition-colors outline-none focus:ring-2 disabled:opacity-50 sm:w-12',
              invalid
                ? 'border-critical focus:border-critical focus:ring-critical/20'
                : 'focus:border-primary focus:ring-primary/20',
              !invalid && (digits[i] ? 'border-line-bright' : 'border-line'),
            )}
          />
        </div>
      ))}
    </div>
  )
}
