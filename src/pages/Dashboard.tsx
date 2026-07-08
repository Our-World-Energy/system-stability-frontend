import { ServiceCard } from '@/components/ui/ServiceCard'
import { TierDivider } from '@/components/ui/TierDivider'
import { useLiveTiers } from '@/hooks/useLiveTiers'
import { useSearchStore } from '@/store/search'
import { useFilterStore } from '@/store/filters'

/** Grid column layout per tier — large modules (T1/T2) vs. compact rows (T3/T4). */
const gridFor: Record<string, string> = {
  'tier-1': 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  'tier-2': 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  'tier-3': 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  'tier-4': 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4',
}

export function Dashboard() {
  const tiers = useLiveTiers()
  const query = useSearchStore((s) => s.query).trim().toLowerCase()
  const selectedTiers = useFilterStore((s) => s.tiers)

  // 1) keep only selected tiers, then 2) filter cards by name/vendor when searching.
  const byTier = tiers.filter((tier) => selectedTiers.includes(tier.id))
  const visibleTiers = query
    ? byTier
        .map((tier) => ({
          ...tier,
          services: tier.services.filter(
            (s) => s.name.toLowerCase().includes(query) || s.vendor.toLowerCase().includes(query),
          ),
        }))
        .filter((tier) => tier.services.length > 0)
    : byTier

  if (visibleTiers.length === 0) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="font-mono text-sm text-fg-muted">
          {query ? (
            <>
              No systems match “<span className="text-fg">{query}</span>”
            </>
          ) : (
            'No tiers selected'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-4">
      {visibleTiers.map((tier) => {
        const size = tier.id === 'tier-1' || tier.id === 'tier-2' ? 'lg' : 'sm'
        return (
          <section key={tier.id} className="space-y-4">
            <TierDivider label={tier.label} />
            <div className={gridFor[tier.id]}>
              {tier.services.map((service) => (
                <ServiceCard key={service.name} service={service} size={size} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
