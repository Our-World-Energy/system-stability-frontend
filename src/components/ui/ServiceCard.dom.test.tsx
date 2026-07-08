// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ServiceCard } from './ServiceCard'
import type { Service } from '@/lib/dashboard-data'

afterEach(cleanup)

const base: Service = { name: 'DocuSign', vendor: 'Statuspage.io', status: 'healthy', updated: '3s ago' }

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
