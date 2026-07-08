import { create } from 'zustand'
import { tiers } from '@/lib/dashboard-data'

/** All tier ids, in order — the default (everything visible) selection. */
export const ALL_TIER_IDS = tiers.map((t) => t.id)

interface FilterState {
  /** Tier ids currently shown on the dashboard. */
  tiers: string[]
  toggleTier: (id: string) => void
  setTiers: (ids: string[]) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  tiers: ALL_TIER_IDS,
  toggleTier: (id) =>
    set((s) => ({
      tiers: s.tiers.includes(id) ? s.tiers.filter((t) => t !== id) : [...s.tiers, id],
    })),
  setTiers: (ids) => set({ tiers: ids }),
  reset: () => set({ tiers: ALL_TIER_IDS }),
}))
