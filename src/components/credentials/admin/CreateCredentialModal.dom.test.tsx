// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateCredentialModal } from './CreateCredentialModal'

// The real algorithm has its own unit test; here the stand-in keeps the DOM test
// off WebCrypto while still proving the modal sends the encrypted value.
const FAKE_ENVELOPE = 'owe.v1.wrapped.iv.ciphertext'
vi.mock('@/lib/crypto/secret-crypto', () => ({
  encryptSecret: vi.fn(async () => FAKE_ENVELOPE),
}))

const stabilityCaller = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/caller')>()),
  stabilityCaller,
}))

// Outcomes are announced by toast, and the container lives in App.tsx — so the
// assertions here are on what would be shown, not on toastify's own DOM.
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/lib/notify', () => ({ notify }))

const SECRET = 'correct-horse-battery'

function renderModal(props: Partial<Parameters<typeof CreateCredentialModal>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const onCreated = vi.fn()
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <CreateCredentialModal open onClose={onClose} onCreated={onCreated} {...props} />
    </QueryClientProvider>,
  )
  return { onCreated, onClose }
}

function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** Fill everything the contract needs, so each test can break exactly one thing. */
function fillValidForm() {
  type(/credential name/i, 'aws-root-console')
  type(/username/i, 'admin@ourworldenergy.com')
  type(/^secret \/ password/i, SECRET)
  type(/^url/i, 'https://console.aws.amazon.com')
  // 2FA defaults to TOTP, which makes the approver required.
  type(/2fa approver/i, 'raj@ourworldenergy.com')
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /create credential/i }))

beforeEach(() => {
  vi.stubEnv('VITE_CREDENTIAL_PUBLIC_KEY', 'test-public-key')
  stabilityCaller.mockResolvedValue({
    status: 200,
    message: 'Credential created',
    data: { id: 'cred_1', name: 'aws-root-console' },
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('CreateCredentialModal', () => {
  it('shows exactly the seven fields the form is specified to have', () => {
    renderModal()

    const labels = [
      'Credential Name',
      'Username',
      'Secret / Password',
      'URL',
      '2FA Type',
      '2FA Approver',
      'Notes',
    ]
    for (const label of labels) expect(screen.getByLabelText(label)).toBeTruthy()

    // Anything beyond that list is a regression — tags, elevation, auto-grant and
    // a confirm-secret box all belong to the payload or to nothing, not the form.
    const controls = document.querySelectorAll('input, select, textarea')
    expect(controls).toHaveLength(labels.length)
  })

  it('sends the encrypted secret and never the plaintext', async () => {
    const { onCreated, onClose } = renderModal()
    fillValidForm()
    submit()

    await waitFor(() => expect(stabilityCaller).toHaveBeenCalledTimes(1))

    const [endpoint, payload] = stabilityCaller.mock.calls[0]
    expect(endpoint).toBe('credential-manager/create-credential')
    expect(payload).toMatchObject({
      name: 'aws-root-console',
      username: 'admin@ourworldenergy.com',
      encrypted_secret: FAKE_ENVELOPE,
      url: 'https://console.aws.amazon.com',
      two_factor_type: 'totp',
      two_factor_approver: 'raj@ourworldenergy.com',
      // Off-form fields still have to reach the handler at their defaults.
      tags: [],
      elevation_duration_seconds: 3600,
      auto_grant: false,
    })
    expect(JSON.stringify(payload)).not.toContain(SECRET)

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(onCreated.mock.calls[0][0]).toMatchObject({ id: 'cred_1' })
    expect(onClose).toHaveBeenCalled()
    // The service's own wording is preferred over a generic "created".
    expect(notify.success).toHaveBeenCalledWith('Credential created')
  })

  it('keeps validation quiet until the first submit, then blocks the call', () => {
    renderModal()
    expect(screen.queryByText(/a credential name is required/i)).toBeNull()

    submit()

    expect(screen.getByText(/a credential name is required/i)).toBeTruthy()
    expect(screen.getByText(/a secret value is required/i)).toBeTruthy()
    expect(stabilityCaller).not.toHaveBeenCalled()
  })

  it('requires the approver to be an email while a second factor is set', () => {
    renderModal()
    fillValidForm()
    type(/2fa approver/i, 'Sarah Jenkins')
    submit()

    expect(screen.getByText(/approver as an email/i)).toBeTruthy()
    expect(stabilityCaller).not.toHaveBeenCalled()
  })

  it('stops asking for an approver when the second factor is set to none', async () => {
    renderModal()
    fillValidForm()
    type(/2fa approver/i, '')
    fireEvent.change(screen.getByLabelText(/2fa type/i), { target: { value: 'none' } })
    submit()

    await waitFor(() => expect(stabilityCaller).toHaveBeenCalledTimes(1))
    expect(stabilityCaller.mock.calls[0][1]).toMatchObject({
      two_factor_type: 'none',
      two_factor_approver: '',
    })
  })

  it('rejects a URL that is not http(s)', () => {
    renderModal()
    fillValidForm()
    type(/^url/i, 'console.aws.amazon.com')
    submit()

    expect(screen.getByText(/starting with http/i)).toBeTruthy()
    expect(stabilityCaller).not.toHaveBeenCalled()
  })

  it('toasts the service’s own wording when the create is rejected', async () => {
    const { onClose } = renderModal()
    const { ApiError } = await import('@/lib/api/caller')
    stabilityCaller.mockRejectedValue(new ApiError('envelope', 'That name is already taken.', 409))

    fillValidForm()
    submit()

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('That name is already taken.'))
    expect(notify.success).not.toHaveBeenCalled()
    // The dialog stays open with the draft intact, so the name can be corrected.
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Credential Name')).toHaveProperty('value', 'aws-root-console')
  })

  it('refuses to submit at all when no encryption key is configured', () => {
    vi.stubEnv('VITE_CREDENTIAL_PUBLIC_KEY', '')
    renderModal()
    fillValidForm()

    expect(screen.getByRole('button', { name: /create credential/i })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('alert').textContent).toMatch(/no encryption key is configured/i)
  })
})
