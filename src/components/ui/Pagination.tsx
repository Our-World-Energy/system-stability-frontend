import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** How many numbered buttons to show at once. */
  window?: number
  className?: string
}

/**
 * Page control driven by a `{ total, page, page_size }` response.
 *
 * The numbered buttons slide to keep the current page inside the window, so a
 * long result set never renders a hundred buttons, and page 1 and the last page
 * stay reachable through Prev/Next.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  window: windowSize = 3,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  if (pageCount <= 1) return null

  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), pageCount - windowSize + 1))
  const pages = Array.from({ length: Math.min(windowSize, pageCount) }, (_, i) => start + i)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Arrow
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        icon={<ChevronLeft className="size-4" />}
      />
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'grid size-8 place-items-center rounded-lg border font-mono text-xs transition-colors',
            p === page
              ? 'border-primary/40 bg-primary/10 text-primary-bright'
              : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
          )}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < pageCount && <span className="text-fg-subtle px-1">…</span>}
      <Arrow
        label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        icon={<ChevronRight className="size-4" />}
      />
    </div>
  )
}

function Arrow({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-8 place-items-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  )
}
