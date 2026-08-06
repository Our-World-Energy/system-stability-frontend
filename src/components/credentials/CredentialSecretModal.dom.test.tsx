// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CredentialSecretModal } from './CredentialSecretModal'
import type { RevealedCredential } from '@/lib/api/credentials'

const copyText = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/clipboard', () => ({ copyText }))
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/lib/notify', () => ({ notify }))

const DETAILS: RevealedCredential = {
  credential_id: 'cred-1',
  name: 'AWS Production',
  username: 'admin@aws.com',
  url: 'https://console.aws.amazon.com',
  secret: 'super-secret-value',
}

function renderModal(props: Partial<Parameters<typeof CredentialSecretModal>[0]> = {}) {
  return render(
    <CredentialSecretModal open loading={false} details={DETAILS} onClose={vi.fn()} {...props} />,
  )
}

beforeEach(() => copyText.mockResolvedValue(true))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CredentialSecretModal', () => {
  it('never renders the plaintext and offers no reveal toggle — copy only', () => {
    renderModal()
    expect(document.body.textContent).not.toContain(DETAILS.secret)
    expect(screen.queryByRole('button', { name: /show password/i })).toBeNull()
    expect(screen.getByRole('button', { name: /copy password/i })).toBeTruthy()
  })

  it('copies the secret to the clipboard when there is no time limit', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /copy password/i }))
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(DETAILS.secret))
  })

  it('shows the countdown banner while the window is open', () => {
    renderModal({ expiresAt: Date.now() + 30 * 60_000 })
    expect(screen.getByText(/temporary access/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /copy password/i })).toHaveProperty('disabled', false)
  })

  it('disables copy and says so once the window has closed', () => {
    renderModal({ expiresAt: Date.now() - 1000 })
    expect(screen.getByText(/access window has closed/i)).toBeTruthy()
    // Disabled is the guarantee the requester relies on — the secret can no
    // longer leave the dialog once access has lapsed.
    expect(screen.getByRole('button', { name: /copy password/i })).toHaveProperty('disabled', true)
  })

  it('shows a decrypting state while the secret is still loading', () => {
    renderModal({ loading: true, details: null })
    expect(screen.getByText(/decrypting secret/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /copy password/i })).toBeNull()
  })
})
