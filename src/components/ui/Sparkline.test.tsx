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
})
