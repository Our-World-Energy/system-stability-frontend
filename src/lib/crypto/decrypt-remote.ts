/*
  Remote decryption via the Cloudflare Worker that holds the RSA private key.

  Replaces the old in-browser decryption: the key no longer ships in the bundle,
  so the copy path fetches the encrypted envelope from the backend (which
  authorizes and audits the copy) and hands it to the Worker to decrypt.

  The Worker URL is `VITE_DECRYPT_WORKER_URL` — its `/decrypt` route. See
  `workers/decrypt` for the deployable Worker.
*/

import { TOKEN_KEY } from '@/lib/auth-storage'
import { SecretCryptoError } from './keys'

const WORKER_URL = import.meta.env.VITE_DECRYPT_WORKER_URL?.trim() || ''

/**
 * Decrypt an `owe.v1.…` envelope by calling the authenticated decryption Worker.
 * The plaintext is returned to the caller and never stored; the browser never
 * holds the private key. Throws `SecretCryptoError` with human-facing wording.
 */
export async function decryptViaWorker(envelope: string): Promise<string> {
  if (!WORKER_URL) {
    throw new SecretCryptoError(
      'missing-key',
      'The decryption service is not configured. Set VITE_DECRYPT_WORKER_URL to the Worker’s /decrypt URL.',
    )
  }

  const token = localStorage.getItem(TOKEN_KEY)

  let res: Response
  try {
    res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ encrypted_secret: envelope }),
    })
  } catch {
    throw new SecretCryptoError('operation-failed', 'Could not reach the decryption service.')
  }

  if (res.status === 401 || res.status === 403) {
    throw new SecretCryptoError(
      'operation-failed',
      'You are not authorised to decrypt this secret, or your session has expired.',
    )
  }
  if (!res.ok) {
    throw new SecretCryptoError('operation-failed', 'The secret could not be decrypted.')
  }

  let secret: unknown
  try {
    const body = (await res.json()) as { data?: { secret?: unknown }; secret?: unknown }
    secret = body?.data?.secret ?? body?.secret
  } catch {
    throw new SecretCryptoError(
      'operation-failed',
      'The decryption service returned an unreadable response.',
    )
  }

  if (typeof secret !== 'string' || !secret) {
    throw new SecretCryptoError(
      'operation-failed',
      'The decryption service did not return a secret.',
    )
  }
  return secret
}
