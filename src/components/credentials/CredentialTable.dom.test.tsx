// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { CredentialTable } from './CredentialTable'
import type { Credential } from '@/lib/api/types'

/** A requester search row — only the fields the table reads need to be present. */
function row(overrides: Partial<Credential> = {}): Credential {
  return {
    id: 'cred-1',
    name: 'AWS Production',
    username: 'admin@aws.com',
    elevation_duration_seconds: 3600,
    // The requester shape has no `auto_grant`; the table reads `has_auto_access`.
    has_auto_access: false,
    ...overrides,
  } as Credential
}

function renderTable(credentials: Credential[], props: Partial<Parameters<typeof CredentialTable>[0]> = {}) {
  const onRequest = vi.fn()
  const onReveal = vi.fn()
  render(
    <CredentialTable
      credentials={credentials}
      onRequest={onRequest}
      onReveal={onReveal}
      grants={{}}
      now={Date.now()}
      {...props}
    />,
  )
  return { onRequest, onReveal }
}

afterEach(cleanup)

describe('CredentialTable requester actions', () => {
  it('shows Request Access when access is not automatic and there is no request', () => {
    const { onRequest } = renderTable([row({ has_auto_access: false })])
    const button = screen.getByRole('button', { name: /request access/i })
    fireEvent.click(button)
    expect(onRequest).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /view password/i })).toBeNull()
  })

  it('shows View Password when the requester has automatic access', () => {
    const { onReveal } = renderTable([row({ id: 'auto', has_auto_access: true })])
    fireEvent.click(screen.getByRole('button', { name: /view password/i }))
    expect(onReveal).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /request access/i })).toBeNull()
  })

  it('shows a Pending chip and no request button while a request is pending', () => {
    renderTable([row({ id: 'pend', has_auto_access: false, request_status: 'pending' })])
    expect(screen.getByText(/pending approval/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /request access/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /view password/i })).toBeNull()
  })

  it('shows a countdown and View Password for a granted request', () => {
    const now = Date.parse('2026-08-06T10:30:00Z')
    const cred = row({
      id: 'grant',
      has_auto_access: false,
      request_status: 'granted',
      grant: {
        id: 'g1',
        status: 'active',
        granted_at: '2026-08-06T10:00:00Z',
        expires_at: '2026-08-06T11:00:00Z', // 30 minutes left at `now`
      },
    })
    const { onReveal } = renderTable([cred], { now })

    const actionCell = screen.getByRole('button', { name: /view password/i }).closest('td')!
    // 30 minutes remaining → 00:30:00.
    expect(within(actionCell).getByText('00:30:00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /view password/i }))
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('does not count down once a granted window has expired, but still allows reveal', () => {
    const now = Date.parse('2026-08-06T12:00:00Z') // past expiry
    const cred = row({
      id: 'expired',
      request_status: 'granted',
      grant: {
        id: 'g2',
        status: 'active',
        granted_at: '2026-08-06T10:00:00Z',
        expires_at: '2026-08-06T11:00:00Z',
      },
    })
    renderTable([cred], { now })
    expect(screen.getByRole('button', { name: /view password/i })).toBeTruthy()
    expect(screen.queryByText(/^\d{2}:\d{2}:\d{2}$/)).toBeNull()
  })
})
