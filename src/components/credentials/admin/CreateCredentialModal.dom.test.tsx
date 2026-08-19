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

// The platform/department dropdowns read the get-metadata catalog through this
// hook (a different host). Stub it so the DOM test stays off the network; each
// test can point `metadata.current` at whatever catalog it needs.
const metadata = vi.hoisted(() => ({
  current: undefined as import('@/lib/api/user-management.types').MetadataData | undefined,
}))
vi.mock('@/hooks/useUserManagement', () => ({
  useUserMetadata: () => ({ data: metadata.current, isLoading: false }),
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
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /create credential/i }))

beforeEach(() => {
  vi.stubEnv('VITE_CREDENTIAL_PUBLIC_KEY', 'test-public-key')
  metadata.current = undefined
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
  it('shows exactly the fields the form is specified to have', () => {
    renderModal()

    const labels = [
      'Credential Name',
      'Username',
      'Secret / Password',
      'URL',
      'Platform',
      'Department',
      'This is a development credential',
      '2FA Type',
      '2FA Approver',
      'Notes',
    ]
    for (const label of labels) expect(screen.getByLabelText(label)).toBeTruthy()

    // Anything beyond that list is a regression — tags, elevation, auto-grant and
    // a confirm-secret box all belong to the payload or to nothing, not the form.
    // The custom-platform text box is not counted: it only appears in "add new" mode.
    const controls = document.querySelectorAll('input, select, textarea')
    expect(controls).toHaveLength(labels.length)
  })

  it('defaults 2FA to None while offering every supported type', () => {
    renderModal()

    const twoFactor = screen.getByLabelText('2FA Type') as HTMLSelectElement
    expect(twoFactor.value).toBe('none')
    expect(Array.from(twoFactor.options, (option) => [option.value, option.text])).toEqual([
      ['none', 'None'],
      ['totp', 'Authenticator App (TOTP)'],
      ['sms', 'SMS / Text Message'],
      ['email', 'Email OTP'],
      ['webauthn', 'Hardware Security Key (FIDO2/U2F)'],
      ['push', 'Push Notification'],
      ['biometric', 'Biometric'],
    ])
    expect(screen.getByLabelText('2FA Approver')).toHaveProperty('disabled', true)

    fireEvent.change(twoFactor, { target: { value: 'totp' } })

    expect(twoFactor.value).toBe('totp')
    expect(screen.getByLabelText('2FA Approver')).toHaveProperty('disabled', false)
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
      two_factor_type: 'none',
      two_factor_approver: '',
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

  it('sends platform_id, department_id and the dev flag for catalog picks', async () => {
    metadata.current = {
      roles: [],
      departments: [{ id: 3, name: 'Engineering' }],
      platforms: [{ id: 10, key: 'aws', name: 'AWS' }],
    }
    renderModal()
    fillValidForm()
    // Native selects carry the ids, not the display names.
    fireEvent.change(screen.getByLabelText('Platform'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Department'), { target: { value: '3' } })
    fireEvent.click(screen.getByLabelText('This is a development credential'))
    submit()

    await waitFor(() => expect(stabilityCaller).toHaveBeenCalledTimes(1))
    expect(stabilityCaller.mock.calls[0][1]).toMatchObject({
      platform_id: 10,
      platform_other: '',
      department_id: 3,
      is_dev: true,
    })
  })

  it('sends platform_other with a null platform_id when "Other" is chosen', async () => {
    metadata.current = {
      roles: [],
      departments: [],
      platforms: [{ id: 10, key: 'aws', name: 'AWS' }],
    }
    renderModal()
    fillValidForm()

    // The free-text box only exists after choosing "Other".
    expect(screen.queryByLabelText(/other platform name/i)).toBeNull()
    fireEvent.change(screen.getByLabelText('Platform'), { target: { value: 'other' } })
    type(/other platform name/i, 'Internal DevOps Platform')
    submit()

    await waitFor(() => expect(stabilityCaller).toHaveBeenCalledTimes(1))
    expect(stabilityCaller.mock.calls[0][1]).toMatchObject({
      platform_id: null,
      platform_other: 'Internal DevOps Platform',
    })
  })

  it('leaves platform, department and dev flag empty when untouched', async () => {
    renderModal()
    fillValidForm()
    submit()

    await waitFor(() => expect(stabilityCaller).toHaveBeenCalledTimes(1))
    expect(stabilityCaller.mock.calls[0][1]).toMatchObject({
      platform_id: null,
      platform_other: '',
      department_id: null,
      is_dev: false,
    })
  })

  it('keeps validation quiet until the first submit, then blocks the call', () => {
    renderModal()
    expect(screen.queryByText(/a credential name is required/i)).toBeNull()

    submit()

    expect(screen.getByText(/a credential name is required/i)).toBeTruthy()
    expect(screen.getByText(/a secret value is required/i)).toBeTruthy()
    expect(stabilityCaller).not.toHaveBeenCalled()
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
