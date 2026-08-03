/*
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ TEMPORARY — DELETE THIS FILE WHEN DECRYPTION MOVES OFF THE BROWSER.          │
  │                                                                             │
  │ Holding the RSA private key in a Vite env var means it is compiled into the  │
  │ JavaScript bundle and readable by anyone who opens devtools. Encrypting      │
  │ against a key that ships next to the ciphertext protects the secret in       │
  │ transit and at rest in the backend, but it is NOT confidentiality from the   │
  │ browser itself.                                                             │
  │                                                                             │
  │ The plan of record is that the private key moves to a Cloudflare Worker (or  │
  │ equivalent) that exposes an authenticated `decrypt` route. When it does:     │
  │   1. point `revealCredentialSecret` (lib/api/credentials.ts) at the Worker   │
  │      instead of calling decryptSecret here — it is the only caller,          │
  │   2. delete this file,                                                       │
  │   3. drop VITE_CREDENTIAL_PRIVATE_KEY from every .env,                       │
  │   4. delete getPrivateKey / isDecryptionConfigured from ./keys.              │
  │                                                                             │
  │ The create and rotate paths never touch this module, so the write flow is    │
  │ unaffected either way — only the admin "copy secret" action depends on it.   │
  └─────────────────────────────────────────────────────────────────────────────┘
*/

import { RSA_ALGORITHM, SecretCryptoError, getPrivateKey, getSubtle, toArrayBuffer } from './keys'
import { aesParams, parseSecretEnvelope } from './secret-crypto'

/**
 * Recover the plaintext behind an envelope using the locally configured private
 * key. Exists so the round trip can be verified end to end while the key still
 * lives on the frontend.
 */
export async function decryptSecret(envelope: string): Promise<string> {
  return decryptSecretWith(await getPrivateKey(), envelope)
}

/** Key-injecting form of `decryptSecret`, used by the tests. */
export async function decryptSecretWith(privateKey: CryptoKey, envelope: string): Promise<string> {
  const { wrappedKey, iv, ciphertext } = parseSecretEnvelope(envelope)
  const subtle = getSubtle()

  try {
    const rawAesKey = await subtle.decrypt(RSA_ALGORITHM, privateKey, toArrayBuffer(wrappedKey))
    const aesKey = await subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt'])
    const plaintext = await subtle.decrypt(aesParams(iv), aesKey, toArrayBuffer(ciphertext))
    return new TextDecoder().decode(plaintext)
  } catch (err) {
    if (err instanceof SecretCryptoError) throw err
    // AES-GCM authenticates its ciphertext, so this also covers tampering — not
    // just the wrong key.
    throw new SecretCryptoError(
      'operation-failed',
      'The secret could not be decrypted with the configured private key.',
    )
  }
}
