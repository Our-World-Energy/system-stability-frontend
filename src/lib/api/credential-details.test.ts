import { beforeEach, describe, expect, it, vi } from 'vitest'

const stabilityCaller = vi.hoisted(() => vi.fn())
vi.mock('./caller', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./caller')>()
  return { ...actual, stabilityCaller }
})

const decryptSecret = vi.hoisted(() => vi.fn(async () => 'plain-secret'))
vi.mock('@/lib/crypto/secret-decrypt', () => ({ decryptSecret }))

import { getCredentialDetails, revealCredentialSecret } from './credentials'
import { endpoints } from './endpoints'

const ID = '3040779e-7d86-45ba-96d6-2d463cc4a3d9'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('credential details and secret routes', () => {
  it('opens the dialog with get-credential-details and maps every returned field', async () => {
    const data = {
      credential_id: ID,
      name: 'Anshu Aurora Credential Test',
      username: 'api_user',
      url: 'https://aurora.example.com',
      notes: 'Rotate quarterly',
      two_factor_type: 'totp',
    }
    stabilityCaller.mockResolvedValue({ status: 200, message: 'credential details fetched', data })

    await expect(getCredentialDetails(ID)).resolves.toEqual(data)
    expect(stabilityCaller).toHaveBeenCalledWith(endpoints.credentialManager.details, { id: ID })
    expect(decryptSecret).not.toHaveBeenCalled()
  })

  it('keeps get-credential-secret as the separately invoked copy operation', async () => {
    stabilityCaller.mockResolvedValue({
      status: 200,
      message: 'credential secret fetched',
      data: { credential_id: ID, encrypted_secret: 'encrypted-envelope' },
    })

    await expect(revealCredentialSecret(ID)).resolves.toBe('plain-secret')
    expect(stabilityCaller).toHaveBeenCalledWith(endpoints.credentialManager.secret, { id: ID })
    expect(decryptSecret).toHaveBeenCalledWith('encrypted-envelope')
  })
})
