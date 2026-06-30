import { Menu, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSystemSummary } from '@/lib/dashboard-data'
import { useSidebarStore } from '@/store/sidebar'
import { useStatusStore } from '@/store/status'
import { useLiveTiers } from '@/hooks/useLiveTiers'
import { ConnectionBadge } from './ConnectionBadge'

export function Navbar() {
  const openMobile = useSidebarStore((s) => s.openMobile)
  const connection = useStatusStore((s) => s.connection)
  const summary = getSystemSummary(useLiveTiers())
  const counters = [
    { value: summary.total, label: 'systems', dot: 'bg-fg-subtle' },
    { value: summary.healthy, label: 'healthy', dot: 'bg-healthy' },
    { value: summary.degraded, label: 'degraded', dot: 'bg-degraded' },
    { value: summary.critical, label: 'critical', dot: 'bg-critical-bright' },
    { value: summary.noFeed, label: 'no-feed', dot: 'bg-fg-subtle' },
  ]
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-line bg-canvas/80 px-4 py-4 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 lg:flex-1">
        <button
          onClick={openMobile}
          aria-label="Open menu"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-bright hover:text-fg lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">System Visibility</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {counters.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 font-mono text-[13px]">
              <span className={cn('size-1.5 rounded-full', c.dot)} />
              <span className="font-semibold text-fg">{c.value}</span>
              <span className="text-fg-muted">{c.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:shrink-0">
        <ConnectionBadge connection={connection} />
        <div className="relative flex-1 lg:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            placeholder="Search systems…"
            className="h-9 w-full rounded-lg border border-line bg-input pl-9 pr-4 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-52 xl:w-64"
          />
        </div>
        <button className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-transparent px-3 text-sm font-medium text-fg-muted transition-colors hover:border-line-bright hover:text-fg">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Tier / Phase</span>
        </button>
      </div>
    </header>
  )
}
