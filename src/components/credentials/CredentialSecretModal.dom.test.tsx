// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CredentialSecretModal } from './CredentialSecretModal'
import type { CredentialDetails } from '@/lib/api/credentials'

const SECRET = 'super-secret-value'
const copyText = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/clipboard', () => ({ copyText }))
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/lib/notify', () => ({ notify }))
const secretRequest = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn(async () => 'super-secret-value'),
  reset: vi.fn(),
}))
vi.mock('@/hooks/useCredentials', () => ({ useRevealSecret: () => secretRequest }))

const DETAILS: CredentialDetails = {
  credential_id: 'cred-1',
  name: 'AWS Production',
  username: 'admin@aws.com',
  url: 'https://console.aws.amazon.com',
  notes: 'Rotate quarterly',
  two_factor_type: 'totp',
}

function renderModal(props: Partial<Parameters<typeof CredentialSecretModal>[0]> = {}) {
  return render(
    <CredentialSecretModal open loading={false} details={DETAILS} onClose={vi.fn()} {...props} />,
  )
}

beforeEach(() => {
  copyText.mockResolvedValue(true)
  secretRequest.mutateAsync.mockResolvedValue(SECRET)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('CredentialSecretModal', () => {
  it('never renders the plaintext and offers no reveal toggle — copy only', () => {
    renderModal()
    expect(document.body.textContent).not.toContain(SECRET)
    expect(screen.queryByRole('button', { name: /show password/i })).toBeNull()
    expect(screen.getByRole('button', { name: /copy password/i })).toBeTruthy()
  })

  it('fetches the secret and copies it for every copy-password click', async () => {
    renderModal()
    const button = screen.getByRole('button', { name: /copy password/i })

    fireEvent.click(button)
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(SECRET))
    expect(secretRequest.mutateAsync).toHaveBeenCalledWith(DETAILS.credential_id)
    expect(secretRequest.reset).toHaveBeenCalled()

    fireEvent.click(button)
    await waitFor(() => expect(secretRequest.mutateAsync).toHaveBeenCalledTimes(2))
    expect(copyText).toHaveBeenCalledTimes(2)
  })

  it('shows all fields returned by the credential-details endpoint', () => {
    renderModal()
    expect(screen.getAllByText(DETAILS.name!).length).toBeGreaterThan(0)
    expect(screen.getByText(DETAILS.username!)).toBeTruthy()
    expect(screen.getByText(DETAILS.url!)).toBeTruthy()
    expect(screen.getByText(DETAILS.notes!)).toBeTruthy()
    expect(screen.getByText('Authenticator App (TOTP)')).toBeTruthy()
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
    expect(secretRequest.mutateAsync).not.toHaveBeenCalled()
  })

  it('does not copy if the access window expires while the secret request is in flight', async () => {
    let releaseSecret!: (value: string) => void
    secretRequest.mutateAsync.mockReturnValue(
      new Promise((resolve) => {
        releaseSecret = resolve
      }),
    )
    vi.spyOn(Date, 'now').mockReturnValue(9_000)
    renderModal({ expiresAt: 10_000 })

    fireEvent.click(screen.getByRole('button', { name: /copy password/i }))
    vi.mocked(Date.now).mockReturnValue(11_000)
    releaseSecret(SECRET)

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        'The access window closed before the password could be copied.',
      ),
    )
    expect(copyText).not.toHaveBeenCalled()
  })

  it('shows a loading state while credential details are being fetched', () => {
    renderModal({ loading: true, details: null })
    expect(screen.getByText(/loading credential details/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /copy password/i })).toBeNull()
  })
})
