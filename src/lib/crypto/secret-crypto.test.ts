import { beforeAll, describe, expect, it } from 'vitest'
import { RSA_ALGORITHM, SecretCryptoError, toArrayBuffer } from './keys'
import {
  ENVELOPE_PREFIX,
  ENVELOPE_VERSION,
  aesParams,
  encryptSecretWith,
  isSecretEnvelope,
  parseSecretEnvelope,
} from './secret-crypto'

// Local decrypt — mirrors what the decryption Worker now does — so the encrypt
// round-trip can still be verified here. There is no app decrypt module to
// import: the private key lives only on the Worker (workers/decrypt).
async function decryptSecretWith(privateKey: CryptoKey, envelope: string): Promise<string> {
  const { wrappedKey, iv, ciphertext } = parseSecretEnvelope(envelope)
  try {
    const rawAes = await crypto.subtle.decrypt(RSA_ALGORITHM, privateKey, toArrayBuffer(wrappedKey))
    const aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, [
      'decrypt',
    ])
    const plaintext = await crypto.subtle.decrypt(aesParams(iv), aesKey, toArrayBuffer(ciphertext))
    return new TextDecoder().decode(plaintext)
  } catch (err) {
    if (err instanceof SecretCryptoError) throw err
    throw new SecretCryptoError('operation-failed', 'The secret could not be decrypted.')
  }
}

let keys: CryptoKeyPair

beforeAll(async () => {
  keys = (await crypto.subtle.generateKey(
    { ...RSA_ALGORITHM, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['encrypt', 'decrypt'],
  )) as CryptoKeyPair
})

describe('encryptSecretWith', () => {
  it('round-trips a secret through the public/private pair', async () => {
    const secret = 'pg_live_7f3a2b9c4d1e8f60'
    const envelope = await encryptSecretWith(keys.publicKey, secret)
    await expect(decryptSecretWith(keys.privateKey, envelope)).resolves.toBe(secret)
  })

  it('round-trips unicode and long values', async () => {
    const secret = `π-Ω-🔐-${'x'.repeat(4000)}`
    const envelope = await encryptSecretWith(keys.publicKey, secret)
    await expect(decryptSecretWith(keys.privateKey, envelope)).resolves.toBe(secret)
  })

  it('produces a versioned five-part envelope and never leaks the plaintext', async () => {
    const envelope = await encryptSecretWith(keys.publicKey, 'hunter2-hunter2')
    const parts = envelope.split('.')

    expect(parts).toHaveLength(5)
    expect(parts[0]).toBe(ENVELOPE_PREFIX)
    expect(parts[1]).toBe(ENVELOPE_VERSION)
    expect(envelope).not.toContain('hunter2')
    expect(isSecretEnvelope(envelope)).toBe(true)
  })

  it('uses a fresh key and IV per call, so the same secret never repeats', async () => {
    const [a, b] = await Promise.all([
      encryptSecretWith(keys.publicKey, 'same-secret'),
      encryptSecretWith(keys.publicKey, 'same-secret'),
    ])
    expect(a).not.toBe(b)
    expect(parseSecretEnvelope(a).iv).not.toEqual(parseSecretEnvelope(b).iv)
  })

  it('refuses an empty secret', async () => {
    await expect(encryptSecretWith(keys.publicKey, '')).rejects.toThrow(SecretCryptoError)
  })
})

describe('decryptSecretWith', () => {
  it('rejects a tampered ciphertext rather than returning garbage', async () => {
    const envelope = await encryptSecretWith(keys.publicKey, 'do-not-modify')
    const parts = envelope.split('.')
    // Flip a character in the AES-GCM ciphertext; the tag must catch it.
    parts[4] = parts[4][0] === 'A' ? `B${parts[4].slice(1)}` : `A${parts[4].slice(1)}`

    await expect(decryptSecretWith(keys.privateKey, parts.join('.'))).rejects.toMatchObject({
      code: 'operation-failed',
    })
  })

  it('rejects a value that is not an envelope', async () => {
    for (const bad of ['', 'plaintext', 'owe.v1.only.three', 'nope.v1.a.b.c']) {
      expect(isSecretEnvelope(bad)).toBe(false)
      await expect(decryptSecretWith(keys.privateKey, bad)).rejects.toMatchObject({
        code: 'malformed-envelope',
      })
    }
  })

  it('rejects an envelope wrapped for a different key', async () => {
    const other = (await crypto.subtle.generateKey(
      { ...RSA_ALGORITHM, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
      true,
      ['encrypt', 'decrypt'],
    )) as CryptoKeyPair
    const envelope = await encryptSecretWith(other.publicKey, 'for-someone-else')

    await expect(decryptSecretWith(keys.privateKey, envelope)).rejects.toMatchObject({
      code: 'operation-failed',
    })
  })
})
