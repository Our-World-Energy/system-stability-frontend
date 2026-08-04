import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tiers } from '@/lib/dashboard-data'
import { ALL_TIER_IDS, useFilterStore } from '@/store/filters'

/** Dropdown to filter which tiers/phases show on the dashboard (multi-select). */
export function TierFilter() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = useFilterStore((s) => s.tiers)
  const toggleTier = useFilterStore((s) => s.toggleTier)
  const setTiers = useFilterStore((s) => s.setTiers)

  const allOn = selected.length === ALL_TIER_IDS.length

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors',
          open || !allOn
            ? 'border-line-bright text-fg'
            : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
        )}
      >
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">Tier / Phase</span>
        {!allOn && (
          <span className="bg-primary/20 text-primary-bright grid size-4 place-items-center rounded-full font-mono text-[10px] font-bold">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div className="border-line bg-surface absolute right-0 z-30 mt-2 w-60 rounded-lg border p-1.5 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-fg-subtle font-mono text-[10px] font-bold tracking-wider uppercase">
              Filter by tier
            </span>
            <button
              onClick={() => setTiers(ALL_TIER_IDS)}
              disabled={allOn}
              className="text-primary-bright font-mono text-[11px] transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              All
            </button>
          </div>
          <ul>
            {tiers.map((t) => {
              const on = selected.includes(t.id)
              return (
                <li key={t.id}>
                  <button
                    onClick={() => toggleTier(t.id)}
                    className="hover:bg-surface-3 flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors"
                  >
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded border transition-colors',
                        on
                          ? 'border-primary bg-primary/20 text-primary-bright'
                          : 'border-line-bright',
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={cn('truncate text-sm', on ? 'text-fg' : 'text-fg-muted')}>
                      {t.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
