// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

afterEach(cleanup)

describe('Sidebar navigation', () => {
  it('exposes only the Overview tab', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    // Overview is present (rendered in both desktop rail + mobile drawer).
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
    // Every other former tab is hidden.
    for (const label of ['Alerts', 'Reviewer Inbox', 'SLOs', 'Audit Log', 'Baselines', 'Settings']) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })
})
