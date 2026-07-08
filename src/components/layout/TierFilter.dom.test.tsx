// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TierFilter } from './TierFilter'
import { ALL_TIER_IDS, useFilterStore } from '@/store/filters'

beforeEach(() => useFilterStore.setState({ tiers: ALL_TIER_IDS }))
afterEach(cleanup)

describe('TierFilter dropdown', () => {
  it('opens, toggles a tier, and updates the store', () => {
    render(<TierFilter />)
    // Panel closed initially.
    expect(screen.queryByText('Filter by tier')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Tier \/ Phase/i }))
    expect(screen.getByText('Filter by tier')).toBeTruthy()

    // Uncheck Tier 1 (label starts with "Tier 1").
    fireEvent.click(screen.getByText(/Tier 1/))
    expect(useFilterStore.getState().tiers).not.toContain('tier-1')
    expect(useFilterStore.getState().tiers.length).toBe(ALL_TIER_IDS.length - 1)
  })

  it('"All" resets the selection', () => {
    useFilterStore.setState({ tiers: ['tier-2'] })
    render(<TierFilter />)
    fireEvent.click(screen.getByRole('button', { name: /Tier \/ Phase/i }))
    fireEvent.click(screen.getByText('All'))
    expect(useFilterStore.getState().tiers).toEqual(ALL_TIER_IDS)
  })
})
