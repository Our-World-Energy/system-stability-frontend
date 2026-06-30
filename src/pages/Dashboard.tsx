import { ServiceCard } from '@/components/ui/ServiceCard'
import { TierDivider } from '@/components/ui/TierDivider'
import { useLiveTiers } from '@/hooks/useLiveTiers'

/** Grid column layout per tier — large modules (T1/T2) vs. compact rows (T3/T4). */
const gridFor: Record<string, string> = {
  'tier-1': 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  'tier-2': 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  'tier-3': 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  'tier-4': 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4',
}

export function Dashboard() {
  const tiers = useLiveTiers()
  return (
    <div className="space-y-8 pb-4">
      {tiers.map((tier) => {
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
