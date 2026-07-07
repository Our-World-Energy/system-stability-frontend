// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Sparkline } from './Sparkline'

afterEach(cleanup)

/** jsdom has no layout, so stub the wrapper's box: 100px wide, at origin. */
function stubRect(el: Element) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 100, bottom: 36, width: 100, height: 36, x: 0, y: 0, toJSON() {},
  } as DOMRect)
}

describe('Sparkline hover (DOM)', () => {
  it('shows the nearest point tooltip on mousemove and hides it on leave', () => {
    const labels = ['10ms · 30s ago', '20ms · 20s ago', '30ms · now']
    const { container } = render(<Sparkline points={[10, 20, 30]} labels={labels} status="healthy" />)
    const wrapper = container.firstElementChild as HTMLElement
    stubRect(wrapper)

    // Hover near the right edge → nearest point is the last (index 2).
    fireEvent.mouseMove(wrapper, { clientX: 100 })
    expect(screen.getByText('30ms · now')).toBeTruthy()

    // Hover at the left edge → first point (index 0).
    fireEvent.mouseMove(wrapper, { clientX: 0 })
    expect(screen.getByText('10ms · 30s ago')).toBeTruthy()

    // Leaving clears the tooltip.
    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByText('10ms · 30s ago')).toBeNull()
  })

  it('is inert (no tooltip) when no labels are supplied', () => {
    const { container } = render(<Sparkline points={[1, 2, 3]} status="healthy" />)
    const wrapper = container.firstElementChild as HTMLElement
    stubRect(wrapper)
    fireEvent.mouseMove(wrapper, { clientX: 50 })
    // Only the svg renders; no tooltip span with a middot label.
    expect(container.textContent).toBe('')
  })
})
