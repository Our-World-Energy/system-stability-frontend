/*
  Key material plumbing for client-side secret encryption.

  Keys live in the Vite env as base64 (PEM armour optional) and are imported into
  WebCrypto `CryptoKey`s exactly once per page load. Only the *public* half is
  ever here — it wraps each secret on the way out. Decryption happens off the
  browser in the Cloudflare Worker (see `lib/crypto/decrypt-remote`), so the
  private key never ships in the bundle.

  Generate a pair with:  node scripts/gen-credential-keys.mjs
*/

/** RSA-OAEP parameters. Must match the generator script and the decrypting side. */
export const RSA_ALGORITHM = { name: 'RSA-OAEP', hash: 'SHA-256' } as const

/** Thrown for every failure in the crypto layer, with a machine-readable `code`. */
export class SecretCryptoError extends Error {
  readonly code: SecretCryptoErrorCode

  constructor(code: SecretCryptoErrorCode, message: string) {
    super(message)
    this.name = 'SecretCryptoError'
    this.code = code
  }
}

export type SecretCryptoErrorCode =
  /** `crypto.subtle` is missing — the page is not in a secure context. */
  | 'unavailable'
  /** The env var holding the key is unset or blank. */
  | 'missing-key'
  /** The env var is set but is not a usable SPKI/PKCS#8 key. */
  | 'invalid-key'
  /** Encrypt/decrypt itself failed (wrong key, tampered envelope). */
  | 'operation-failed'
  /** The envelope string is not in the expected `owe.v1.…` shape. */
  | 'malformed-envelope'

/**
 * WebCrypto's SubtleCrypto, or a clear error explaining why it is absent.
 *
 * `crypto.subtle` is only exposed in a secure context: https, or http on
 * localhost. A build served over plain http from an IP address gets `undefined`
 * here, which would otherwise surface as a confusing "cannot read properties of
 * undefined".
 */
export function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new SecretCryptoError(
      'unavailable',
      'Secret encryption is unavailable because this page is not served from a secure context. Use https, or localhost during development.',
    )
  }
  return subtle
}

/** Env var holding the SPKI public key used to wrap every secret. */
export const PUBLIC_KEY_ENV = 'VITE_CREDENTIAL_PUBLIC_KEY'

/** True when a public key is configured, i.e. credentials can be created at all. */
export function isEncryptionConfigured(): boolean {
  return readKeyMaterial(PUBLIC_KEY_ENV) !== ''
}

function readKeyMaterial(name: string): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Strip PEM armour and whitespace, then base64-decode to the DER bytes WebCrypto
 * wants. Accepts either a full `-----BEGIN …-----` block or a bare base64 blob,
 * because a PEM pasted into a `.env` file loses its newlines either way.
 */
export function decodeKeyMaterial(material: string, envName: string): Uint8Array {
  const base64 = material
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (!base64) {
    throw new SecretCryptoError('invalid-key', `${envName} does not contain any key data.`)
  }
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    throw new SecretCryptoError('invalid-key', `${envName} is not valid base64.`)
  }
}

// Imported once and reused: importKey is async and would otherwise run on every
// keystroke-triggered encrypt. Failures are not cached, so fixing the env var and
// hot-reloading retries cleanly.
let publicKeyCache: Promise<CryptoKey> | null = null

/** The configured RSA-OAEP public key, for wrapping per-secret AES keys. */
export function getPublicKey(): Promise<CryptoKey> {
  publicKeyCache ??= importKey('spki', PUBLIC_KEY_ENV, ['encrypt']).catch((err) => {
    publicKeyCache = null
    throw err
  })
  return publicKeyCache
}

async function importKey(
  format: 'spki' | 'pkcs8',
  envName: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const material = readKeyMaterial(envName)
  if (!material) {
    throw new SecretCryptoError(
      'missing-key',
      `${envName} is not set. Run "node scripts/gen-credential-keys.mjs" and add the printed lines to your .env.`,
    )
  }
  const der = decodeKeyMaterial(material, envName)
  try {
    return await getSubtle().importKey(format, toArrayBuffer(der), RSA_ALGORITHM, false, usages)
  } catch {
    throw new SecretCryptoError(
      'invalid-key',
      `${envName} is not a valid ${format.toUpperCase()} RSA-OAEP key.`,
    )
  }
}

/** Detach a view into a standalone ArrayBuffer, which is what WebCrypto accepts. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer
}

/** Clear the import caches. Test-only seam; also lets a hot reload pick up new keys. */
export function resetKeyCache(): void {
  publicKeyCache = null
}
