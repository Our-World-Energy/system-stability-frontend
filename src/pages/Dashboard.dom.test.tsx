// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import { useSearchStore } from '@/store/search'
import { ALL_TIER_IDS, useFilterStore } from '@/store/filters'

beforeEach(() => {
  useSearchStore.setState({ query: '' })
  useFilterStore.setState({ tiers: ALL_TIER_IDS })
})
afterEach(cleanup)

describe('Dashboard search', () => {
  it('shows all cards with an empty query', () => {
    render(<Dashboard />)
    expect(screen.getByText('Aurora')).toBeTruthy()
    expect(screen.getByText('DocuSign')).toBeTruthy()
  })

  it('filters cards by name and drops non-matches', () => {
    render(<Dashboard />)
    act(() => useSearchStore.setState({ query: 'aurora' }))
    expect(screen.getByText('Aurora')).toBeTruthy()
    expect(screen.queryByText('DocuSign')).toBeNull()
    expect(screen.queryByText('RingCentral')).toBeNull()
  })

  it('shows an empty-state message when nothing matches', () => {
    render(<Dashboard />)
    act(() => useSearchStore.setState({ query: 'zzz-nope' }))
    expect(screen.getByText(/No systems match/i)).toBeTruthy()
  })
})

describe('Dashboard tier filter', () => {
  it('shows only cards from selected tiers', () => {
    render(<Dashboard />)
    // Tier 1 has Aurora; Tier 2 has RingCentral.
    expect(screen.getByText('Aurora')).toBeTruthy()
    expect(screen.getByText('RingCentral')).toBeTruthy()

    act(() => useFilterStore.setState({ tiers: ['tier-1'] }))
    expect(screen.getByText('Aurora')).toBeTruthy() // tier-1 kept
    expect(screen.queryByText('RingCentral')).toBeNull() // tier-2 hidden
  })

  it('shows a "No tiers selected" empty state when none are chosen', () => {
    render(<Dashboard />)
    act(() => useFilterStore.setState({ tiers: [] }))
    expect(screen.getByText(/No tiers selected/i)).toBeTruthy()
  })

  it('composes tier + search filters', () => {
    render(<Dashboard />)
    act(() => {
      useFilterStore.setState({ tiers: ['tier-1'] })
      useSearchStore.setState({ query: 'ringcentral' }) // RingCentral is tier-2, excluded
    })
    expect(screen.getByText(/No systems match/i)).toBeTruthy()
  })
})
