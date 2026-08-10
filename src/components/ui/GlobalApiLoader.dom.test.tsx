// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalApiLoader } from './GlobalApiLoader'

const activity = vi.hoisted(() => ({ fetching: 0, mutating: 0 }))
vi.mock('@tanstack/react-query', () => ({
  useIsFetching: () => activity.fetching,
  useIsMutating: () => activity.mutating,
}))

beforeEach(() => {
  vi.useFakeTimers()
  activity.fetching = 0
  activity.mutating = 0
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function update(rerender: (ui: React.ReactNode) => void, counts: Partial<typeof activity>) {
  act(() => {
    Object.assign(activity, counts)
    rerender(<GlobalApiLoader />)
  })
}

describe('GlobalApiLoader', () => {
  it('delays its appearance so quick API calls do not flicker', () => {
    const { rerender } = render(<GlobalApiLoader />)
    update(rerender, { fetching: 1 })

    act(() => vi.advanceTimersByTime(179))
    expect(screen.queryByRole('status')).toBeNull()

    update(rerender, { fetching: 0 })
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows fetch activity and remains visible long enough for a smooth transition', () => {
    const { rerender } = render(<GlobalApiLoader />)
    update(rerender, { fetching: 1 })
    act(() => vi.advanceTimersByTime(180))

    expect(screen.getByRole('status', { name: /loading data/i })).toBeTruthy()
    expect(screen.getByText('1 request in progress')).toBeTruthy()

    update(rerender, { fetching: 0 })
    expect(screen.getByText('Finishing up')).toBeTruthy()
    act(() => vi.advanceTimersByTime(499))
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('distinguishes mutations from data fetches', () => {
    const { rerender } = render(<GlobalApiLoader />)
    update(rerender, { mutating: 2 })
    act(() => vi.advanceTimersByTime(180))

    expect(screen.getByRole('status', { name: /saving changes/i })).toBeTruthy()
    expect(screen.getByText('2 requests in progress')).toBeTruthy()
  })
})
