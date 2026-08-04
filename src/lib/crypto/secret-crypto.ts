/*
  Client-side secret encryption for the credential vault.

  A plaintext secret must never leave the browser. `encryptSecret` turns it into a
  self-describing envelope that only the holder of the RSA private key can open,
  and that is the value sent as `encrypted_secret`.

  Scheme — hybrid, the standard shape, all via native WebCrypto (no dependencies):

    1. a fresh AES-256-GCM key is generated per secret (never reused),
    2. the secret is encrypted under it with a fresh 12-byte IV,
    3. that AES key is wrapped with the RSA-OAEP-SHA256 public key.

  RSA alone would cap the payload at ~190 bytes and leak length; AES-GCM also
  authenticates the ciphertext, so tampering fails loudly instead of decrypting to
  garbage.

  Envelope (dot-separated; base64 never contains a dot, so this parses unambiguously):

    owe.v1.<rsa-wrapped aes key>.<iv>.<aes-gcm ciphertext+tag>

  The version segment is there so the decrypting side can change scheme without
  guessing at what it has been handed.
*/

import { RSA_ALGORITHM, SecretCryptoError, getPublicKey, getSubtle, toArrayBuffer } from './keys'

/** Envelope namespace, so a stray value is recognisably ours. */
export const ENVELOPE_PREFIX = 'owe'
/** Bump alongside any change to the scheme below. */
export const ENVELOPE_VERSION = 'v1'

const AES_ALGORITHM = 'AES-GCM'
const AES_KEY_BITS = 256
const IV_BYTES = 12

/**
 * Encrypt `plaintext` under the configured public key.
 *
 * Throws `SecretCryptoError` if no key is configured or the page is not in a
 * secure context — callers surface `err.message`, which is written for humans.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  return encryptSecretWith(await getPublicKey(), plaintext)
}

/**
 * Key-injecting form of `encryptSecret`, used by the tests and by anything that
 * needs to encrypt under a key other than the configured one.
 */
export async function encryptSecretWith(publicKey: CryptoKey, plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new SecretCryptoError('operation-failed', 'There is no secret value to encrypt.')
  }
  const subtle = getSubtle()

  try {
    const aesKey = await subtle.generateKey({ name: AES_ALGORITHM, length: AES_KEY_BITS }, true, [
      'encrypt',
    ])
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const ciphertext = await subtle.encrypt(
      { name: AES_ALGORITHM, iv },
      aesKey,
      new TextEncoder().encode(plaintext),
    )
    const rawAesKey = await subtle.exportKey('raw', aesKey)
    const wrappedKey = await subtle.encrypt(RSA_ALGORITHM, publicKey, rawAesKey)

    return [
      ENVELOPE_PREFIX,
      ENVELOPE_VERSION,
      toBase64(wrappedKey),
      toBase64(iv),
      toBase64(ciphertext),
    ].join('.')
  } catch (err) {
    if (err instanceof SecretCryptoError) throw err
    throw new SecretCryptoError('operation-failed', 'The secret could not be encrypted.')
  }
}

/** True if `value` looks like an envelope this module produced. */
export function isSecretEnvelope(value: string): boolean {
  return parseEnvelopeParts(value) !== null
}

export interface SecretEnvelope {
  version: string
  wrappedKey: Uint8Array
  iv: Uint8Array
  ciphertext: Uint8Array
}

/** Split an envelope into its parts, or throw `malformed-envelope`. */
export function parseSecretEnvelope(value: string): SecretEnvelope {
  const parts = parseEnvelopeParts(value)
  if (!parts) {
    throw new SecretCryptoError(
      'malformed-envelope',
      'That value is not an encrypted secret envelope.',
    )
  }
  const [version, wrappedKey, iv, ciphertext] = parts
  try {
    return {
      version,
      wrappedKey: fromBase64(wrappedKey),
      iv: fromBase64(iv),
      ciphertext: fromBase64(ciphertext),
    }
  } catch {
    throw new SecretCryptoError('malformed-envelope', 'The encrypted secret envelope is corrupt.')
  }
}

function parseEnvelopeParts(value: string): [string, string, string, string] | null {
  const parts = value.split('.')
  if (parts.length !== 5) return null
  const [prefix, version, wrappedKey, iv, ciphertext] = parts
  if (prefix !== ENVELOPE_PREFIX || !version || !wrappedKey || !iv || !ciphertext) return null
  return [version, wrappedKey, iv, ciphertext]
}

/** WebCrypto AES-GCM parameters for a parsed envelope, shared with the decrypt side. */
export function aesParams(iv: Uint8Array): AesGcmParams {
  return { name: AES_ALGORITHM, iv: toArrayBuffer(iv) }
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  // Chunked so a large secret cannot blow the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}
