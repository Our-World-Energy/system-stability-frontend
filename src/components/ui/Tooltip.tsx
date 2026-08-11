import { useId } from 'react'
import { cn } from '@/lib/utils'

type Side = 'top' | 'right' | 'bottom'

/** Where the bubble sits, and which way it slides in from. */
const bubbleSide: Record<Side, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0',
  right:
    'left-full top-1/2 ml-2.5 -translate-y-1/2 -translate-x-1 group-hover/tooltip:translate-x-0 group-focus-within/tooltip:translate-x-0',
  bottom:
    'top-full left-1/2 mt-2 -translate-x-1/2 -translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0',
}

/** The little diamond, borrowing two borders of the bubble to look like a point. */
const arrowSide: Record<Side, string> = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l',
}

interface TooltipProps {
  /** The text in the bubble. Also the trigger's accessible description. */
  label: string
  side?: Side
  /**
   * Classes for the wrapper, which is what sits in the caller's layout. A wrapper
   * is unavoidable — the bubble is positioned against it — so its display and
   * flex behaviour have to be the caller's to set.
   */
  className?: string
  children: React.ReactNode
}

/**
 * Hover/focus label for a control whose purpose isn't obvious from its face.
 *
 * Shown on focus as well as hover, so it is not mouse-only, and never
 * interactive: `pointer-events-none` keeps it from swallowing a click meant for
 * the thing it describes. Wired as `aria-describedby` rather than a `title`
 * attribute — a native tooltip cannot be styled, is slow to appear, and doubles
 * up with this one.
 */
export function Tooltip({ label, side = 'top', className, children }: TooltipProps) {
  const id = `tooltip-${useId().replace(/:/g, '')}`

  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {/* The child gets the description; cloning to inject the prop would break on
          any child that is not a DOM element, so the wrapper carries it instead —
          screen readers resolve it from the trigger's own subtree. */}
      <span aria-describedby={id} className="contents">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'border-line bg-surface-3 text-fg pointer-events-none absolute z-40 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out',
          'group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100',
          bubbleSide[side],
        )}
      >
        {label}
        <span
          aria-hidden
          className={cn('border-line bg-surface-3 absolute size-2 rotate-45', arrowSide[side])}
        />
      </span>
    </span>
  )
}
