// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { navItems } from '@/lib/navigation'
import { Sidebar } from './Sidebar'

afterEach(cleanup)

describe('Sidebar navigation', () => {
  it('renders every configured navigation item', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    for (const item of navItems) {
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0)
    }
  })
})
