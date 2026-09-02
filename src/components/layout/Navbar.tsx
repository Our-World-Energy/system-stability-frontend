import { Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import logoUrl from '@/assets/Logo.svg'
import { getSystemSummary } from '@/lib/dashboard-data'
import { resolvePageMeta } from '@/lib/page-meta'
import { useSidebarStore } from '@/store/sidebar'
import { useStatusStore } from '@/store/status'
import { useSearchStore } from '@/store/search'
import { useLiveTiers } from '@/hooks/useLiveTiers'
import { ConnectionBadge } from './ConnectionBadge'
import { TierFilter } from './TierFilter'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const openMobile = useSidebarStore((s) => s.openMobile)
  const connection = useStatusStore((s) => s.connection)
  const query = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)
  const { pathname } = useLocation()
  const pageMeta = resolvePageMeta(pathname)
  const summary = getSystemSummary(useLiveTiers())
  const counters = [
    { value: summary.total, label: 'systems', dot: 'bg-fg-subtle' },
    { value: summary.healthy, label: 'healthy', dot: 'bg-healthy' },
    { value: summary.degraded, label: 'degraded', dot: 'bg-degraded' },
    { value: summary.critical, label: 'critical', dot: 'bg-critical-bright' },
    { value: summary.noFeed, label: 'down', dot: 'bg-critical-bright' },
  ]
  return (
    <header className="border-line bg-canvas/80 sticky top-0 z-30 flex flex-col gap-4 border-b px-4 py-4 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Below lg there is no sidebar rail, so this row carries the branding and
          the way into the drawer: mark on the left, menu on the right. The page
          title is not repeated here — the screen itself says what it is, and on a
          phone the row is worth more as navigation. */}
      <div className="flex items-center justify-between lg:hidden">
        <Link
          to="/"
          aria-label="Backplate — go to the overview"
          className="flex min-w-0 items-center gap-2.5"
        >
          <img src={logoUrl} alt="" className="size-9 shrink-0" />
          {/* Same two lines as the sidebar's brand, so the drawer and the header
              agree about what this product is called. */}
          <span className="min-w-0">
            <span className="text-fg block truncate text-sm leading-tight font-bold">
              BACKPLATE
            </span>
            <span className="text-fg-muted block truncate font-mono text-[10px] tracking-[0.12em] uppercase">
              By - Our World Energy
            </span>
          </span>
        </Link>
        <button
          onClick={openMobile}
          aria-label="Open menu"
          className="border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-9 shrink-0 place-items-center rounded-lg border transition-colors"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <div
        className={cn(
          'min-w-0 flex-wrap items-center gap-x-6 gap-y-3 lg:flex lg:flex-1',
          // Nothing to show on a phone unless the counters are on — and an empty
          // flex row would still spend the header's gap on itself.
          pageMeta.showSystemStats ? 'flex' : 'hidden',
        )}
      >
        <h1 className="text-fg hidden text-2xl font-semibold tracking-tight lg:block">
          {pageMeta.title}
        </h1>
        {pageMeta.showSystemStats && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {counters.map((c) => (
              <span key={c.label} className="flex items-center gap-1.5 font-mono text-[13px]">
                <span className={cn('size-1.5 rounded-full', c.dot)} />
                <span className="text-fg font-semibold">{c.value}</span>
                <span className="text-fg-muted">{c.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 lg:shrink-0">
        <ThemeToggle />
        <ConnectionBadge connection={connection} />
        {/* Search + tier filter are Overview tools; other pages show only title + Live. */}
        {pageMeta.showSystemStats && (
          <>
            <div className="relative flex-1 lg:flex-none">
              <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search systems…"
                className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-9 w-full rounded-lg border pr-4 pl-9 text-sm transition-colors outline-none focus:ring-2 lg:w-52 xl:w-64"
              />
            </div>
            <TierFilter />
          </>
        )}
      </div>
    </header>
  )
}
