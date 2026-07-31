import authBgUrl from '@/assets/auth-bg.svg'

/**
 * The full-bleed data-centre artwork behind every auth card.
 *
 * Painted edge to edge with no dimming overlay — the SVG already carries its own
 * navy wash, so anything added here only muddies it. Sits before the card in DOM
 * order (rather than on a negative z-index) so the card stacks above it without
 * depending on where the nearest stacking context happens to be.
 *
 * The shell's #0b1326 backdrop matches the artwork's own base colour, so there is
 * no visible flash before the image lands.
 */
export function AuthBackdrop() {
  return (
    <img
      src={authBgUrl}
      alt=""
      aria-hidden
      decoding="async"
      fetchPriority="high"
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
  )
}
