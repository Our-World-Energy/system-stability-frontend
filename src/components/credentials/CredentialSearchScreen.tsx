import { cn } from '@/lib/utils'
import { CredentialSearchInput } from './CredentialSearchInput'

interface CredentialSearchScreenProps {
  query: string
  onQueryChange: (value: string) => void
  /** One-line caption: the hero sub-heading when idle; the top-left caption once searching. */
  subheading: string
  /** Right-aligned action buttons in the header row. */
  actions: React.ReactNode
  /** Results rendered below the search bar once a query is entered. */
  children: React.ReactNode
}

/**
 * Shared "search-first" screen for the credential catalog and management pages.
 *
 * Idle: a centered hero (heading + sub-heading + search box). As soon as the
 * user types, the hero heading fades out, the search bar glides up to the top,
 * the sub-heading slides into the top-left of the action row, and the results
 * rise into view. All motion is CSS transition/keyframe based (and respects
 * prefers-reduced-motion).
 */
export function CredentialSearchScreen({
  query,
  onQueryChange,
  subheading,
  actions,
  children,
}: CredentialSearchScreenProps) {
  const hasQuery = query.trim().length > 0

  return (
    <div className="pb-4">
      {/* Header row — caption slides in on the left once searching; actions stay right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {hasQuery && (
            <p className="animate-rise-in text-fg-muted max-w-xl truncate text-sm">{subheading}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      {/*
        Search zone — the bar rises (margin) and stretches wide (max-width) at the
        same time, over the same duration/easing, so it reads as one smooth motion.
      */}
      <div
        className={cn('transition-[margin] duration-500 ease-out', hasQuery ? 'mt-6' : 'mt-[20vh]')}
      >
        {/* Hero heading — collapses and lifts upward as it fades once a query exists. */}
        <div
          className={cn(
            'overflow-hidden text-center transition-all duration-300 ease-out',
            hasQuery
              ? 'mb-0 max-h-0 -translate-y-2 opacity-0'
              : 'mb-6 max-h-40 translate-y-0 opacity-100',
          )}
        >
          <h2 className="text-fg text-xl font-semibold tracking-tight">
            Enter a credential name to begin
          </h2>
          <p className="text-fg-muted mt-2 text-sm">{subheading}</p>
        </div>

        <CredentialSearchInput
          value={query}
          onChange={onQueryChange}
          autoFocus
          className={cn(
            'transition-[max-width] duration-500 ease-out',
            hasQuery ? 'max-w-full' : 'mx-auto max-w-xl',
          )}
        />

        {hasQuery && <div className="animate-rise-in mt-6 space-y-6">{children}</div>}
      </div>
    </div>
  )
}
