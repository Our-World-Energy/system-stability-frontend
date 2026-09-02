// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ServiceCard } from './ServiceCard'
import type { Service } from '@/lib/dashboard-data'

afterEach(cleanup)

const base: Service = {
  name: 'DocuSign',
  vendor: 'Statuspage.io',
  status: 'healthy',
  updated: '3s ago',
}

describe('ServiceCard coming-soon', () => {
  it('shows a "Coming Soon" overlay and blurs content when comingSoon', () => {
    const { container } = render(<ServiceCard service={{ ...base, comingSoon: true }} />)
    expect(screen.getByText('Coming Soon')).toBeTruthy()
    // The content wrapper is blurred.
    expect(container.querySelector('.blur-\\[3px\\]')).toBeTruthy()
  })

  it('renders normally (no overlay/blur) when comingSoon is absent', () => {
    const { container } = render(<ServiceCard service={base} />)
    expect(screen.queryByText('Coming Soon')).toBeNull()
    expect(container.querySelector('.blur-\\[3px\\]')).toBeNull()
  })
})

describe('ServiceCard per-DB indicators (OWE DB)', () => {
  const owedb: Service = {
    name: 'OWE DB',
    vendor: '/health',
    status: 'degraded',
    updated: '3s ago',
    dbIndicators: [
      { label: 'Main DB', up: true },
      { label: 'Lite DB', up: false, error: 'owe_lite_db connection is not initialized' },
    ],
  }

  it('renders an UP/DOWN chip per database', () => {
    render(<ServiceCard service={owedb} size="lg" />)
    expect(screen.getByText('Main DB UP')).toBeTruthy()
    const down = screen.getByText('Lite DB DOWN')
    expect(down).toBeTruthy()
    // The down DB surfaces its vendor error as a tooltip.
    expect(down.getAttribute('title')).toBe('owe_lite_db connection is not initialized')
  })

  it('shows a historical-data badge only when historicalDataReady is false', () => {
    const { rerender } = render(<ServiceCard service={owedb} size="lg" />)
    expect(screen.queryByText('Hist')).toBeNull()
    rerender(<ServiceCard service={{ ...owedb, historicalDataReady: false }} size="lg" />)
    expect(screen.getByText('Hist')).toBeTruthy()
  })

  it('renders no chips when there are no dbIndicators (e.g. vendor_silent)', () => {
    render(
      <ServiceCard
        service={{ ...owedb, status: 'vendor_silent', dbIndicators: undefined }}
        size="lg"
      />,
    )
    expect(screen.queryByText('Main DB UP')).toBeNull()
    // The status pill itself reads DOWN on vendor_silent, so match the chip text only.
    expect(screen.queryByText(/DB DOWN/)).toBeNull()
  })
})
