// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CredentialRecordTable } from './CredentialRecordTable'
import type { Credential } from '@/lib/api/types'

vi.mock('@/components/credentials/CredentialSecretModal', () => ({
  CredentialSecretModal: () => null,
}))

afterEach(cleanup)

describe('CredentialRecordTable', () => {
  it('shows notes instead of an inferred status and safely clamps long content', () => {
    const longNotes =
      'Test credential for development use with a very long unbroken reference: ' + 'x'.repeat(300)
    const records = [
      {
        id: '29738bc7-bc84-4082-863b-82b9a334e11c',
        name: 'Test-Yek',
        elevation_duration_seconds: 3600,
        is_dev: false,
        last_rotated_by: 'Yek Bajada',
        has_auto_access: true,
      },
      {
        id: 'c30200f2-0538-402a-8116-6fbbfdadf329',
        name: 'Test Development Credential',
        notes: longNotes,
        elevation_duration_seconds: 3600,
        is_dev: true,
        last_rotated_by: 'Shams Tanweer',
        has_auto_access: true,
      },
    ] as Credential[]

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CredentialRecordTable
          records={records}
          onAction={vi.fn()}
          permissions={{ rotate: true, requestRotation: false, purge: true }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('columnheader', { name: 'Notes' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Last Rotated By' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).toBeNull()
    expect(screen.queryByText('Archived')).toBeNull()
    expect(screen.queryByText('Never rotated')).toBeNull()
    expect(screen.getByText('Not provided')).toBeTruthy()

    const note = screen.getByText(longNotes)
    expect(note).toHaveProperty('title', longNotes)
    expect(note.className).toContain('line-clamp-2')
    expect(note.className).toContain('break-all')

    expect(screen.getByText('Yek Bajada')).toBeTruthy()
    expect(screen.getByText('Shams Tanweer')).toBeTruthy()
    expect(screen.queryByText('Date unavailable')).toBeNull()
  })
})
