import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  it('renders a line + area path for a normal series', () => {
    const html = renderToStaticMarkup(<Sparkline points={[1, 5, 3, 8]} status="healthy" />)
    expect(html).toContain('<svg')
    expect(html.match(/<path/g)?.length).toBe(2) // area + line
  })

  it('renders interactively (no tooltip until hover) when labels are supplied', () => {
    const html = renderToStaticMarkup(
      <Sparkline points={[10, 20]} labels={['10ms · now', '20ms · now']} status="degraded" />,
    )
    expect(html).toContain('<svg')
    expect(html).not.toContain('10ms · now') // tooltip only appears on hover
  })

  it('guards against a single point (no division by zero)', () => {
    const html = renderToStaticMarkup(<Sparkline points={[42]} />)
    expect(html).not.toContain('<svg')
  })

  it('draws a dot at every status change, tinted by the new state', () => {
    // healthy→degraded (yellow), degraded→healthy (green), healthy→critical (red).
    const html = renderToStaticMarkup(
      <Sparkline points={[10, 20, 30, 40]} markers={['healthy', 'degraded', 'healthy', 'critical']} status="degraded" />,
    )
    expect(html.match(/rounded-full/g)?.length).toBe(3)
    expect(html).toContain('background-color:var(--color-degraded)')
    expect(html).toContain('background-color:var(--color-healthy)')
    expect(html).toContain('background-color:var(--color-critical-bright)')
  })

  it('draws NO dots for a steady state (the key fix)', () => {
    // A persistently degraded system must not sprinkle a dot on every sample.
    const steady = renderToStaticMarkup(
      <Sparkline points={[10, 20, 30, 40, 50]} markers={['degraded', 'degraded', 'degraded', 'degraded', 'degraded']} status="degraded" />,
    )
    expect(steady).not.toContain('rounded-full')

    const allHealthy = renderToStaticMarkup(
      <Sparkline points={[10, 20, 30]} markers={['healthy', 'healthy', 'healthy']} status="healthy" />,
    )
    expect(allHealthy).not.toContain('rounded-full')
  })

  it('marks only the transition, not every sample of the episode', () => {
    // healthy → degraded(×3) → critical(×2): one dot entering degraded, one escalating.
    const html = renderToStaticMarkup(
      <Sparkline
        points={[10, 20, 30, 40, 50, 60]}
        markers={['healthy', 'degraded', 'degraded', 'degraded', 'critical', 'critical']}
        status="critical"
      />,
    )
    expect(html.match(/rounded-full/g)?.length).toBe(2)
  })
})
