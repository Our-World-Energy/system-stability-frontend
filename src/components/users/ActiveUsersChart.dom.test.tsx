// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ActiveUsersChart } from './ActiveUsersChart'
import { getActiveUserStats } from '@/lib/api/user-management'
import type { ActiveUserStatsData } from '@/lib/api/user-management.types'

vi.mock('@/lib/api/user-management', () => ({ getActiveUserStats: vi.fn() }))

const mockGetActiveUserStats = vi.mocked(getActiveUserStats)

/** The viewBox the chart draws into, and the padding it keeps inside it. */
const H = 240
const PAD = 12

/**
 * A week that drops to nothing between busy days — the shape that used to break
 * the curve, because a cardinal spline overshoots hardest on a sharp reversal.
 */
function spikySeries(): ActiveUserStatsData {
  const counts = [900, 0, 950, 0, 1000, 0, 880]
  const daily = counts.map((active_users, i) => ({
    date: `2026-08-0${i + 1}`,
    active_users,
  }))
  return {
    start_date: '2026-08-01',
    end_date: '2026-08-07',
    average_daily_active_users: 532,
    peak_daily_active_users: 1000,
    percent_change_vs_previous_period: 0,
    daily,
    previous_period_daily: daily.map((p) => ({ ...p, active_users: 1000 - p.active_users })),
  }
}

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveUsersChart />
    </QueryClientProvider>,
  )
}

/** Every y coordinate in a path's `d`, control points included. */
function pathYs(d: string): number[] {
  return [...d.matchAll(/-?[\d.]+,(-?[\d.]+)/g)].map((match) => Number(match[1]))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetActiveUserStats.mockResolvedValue(spikySeries())
})
afterEach(cleanup)

describe('ActiveUsersChart curve', () => {
  it('keeps the whole curve inside the viewBox, however sharply it drops', async () => {
    renderChart()
    await screen.findByRole('img', { name: /Active users/i })

    // Both series: the solid current line and the dashed comparison.
    const paths = [...document.querySelectorAll('path[stroke]')]
    expect(paths.length).toBeGreaterThanOrEqual(2)

    for (const path of paths) {
      const ys = pathYs(path.getAttribute('d') ?? '')
      expect(ys.length).toBeGreaterThan(0)
      // Anything outside this band is clipped by the SVG viewport, which showed as
      // a break in the line and a missing chunk of the fill beneath it.
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(PAD)
      expect(Math.max(...ys)).toBeLessThanOrEqual(H - PAD)
    }
  })

  it('draws one unbroken stroke rather than a run of segments', async () => {
    renderChart()
    await screen.findByRole('img', { name: /Active users/i })

    const line = document.querySelector('path[stroke][pathLength]')!
    const d = line.getAttribute('d') ?? ''

    // A single move-to at the start; every bucket after it is a curve continuing
    // from the last, so there is nowhere for a gap to appear.
    expect(d.match(/M/g)).toHaveLength(1)
    expect(d.match(/C/g)).toHaveLength(spikySeries().daily.length - 1)
  })

  it('closes the filled area along the bottom edge', async () => {
    renderChart()
    await screen.findByRole('img', { name: /Active users/i })

    const area = document.querySelector('path[fill^="url("]')!
    // Down to the bottom-right corner, across to the bottom-left, closed — so the
    // fill reaches the axis whatever the curve does above it.
    expect(area.getAttribute('d')).toMatch(new RegExp(`L600,${H} L0,${H} Z$`))
  })
})
