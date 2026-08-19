/*
  Cloudflare Worker — credential secret decryption.

  Holds the RSA private key as a Worker secret so it never ships in the app
  bundle. The browser fetches the encrypted envelope from the backend (which
  authorizes and audits every copy), then POSTs it here to be decrypted.

    POST /decrypt
      headers  Authorization: Bearer <app JWT>
      body     { "encrypted_secret": "owe.v1.<wrapped>.<iv>.<ciphertext>" }
      200      { "status": 200, "message": "secret decrypted", "data": { "secret": "…" } }

  The envelope scheme mirrors src/lib/crypto exactly:
    a fresh AES-256-GCM key encrypts the secret; that key is RSA-OAEP-SHA256
    wrapped with the credential public key; the three parts are base64.

  Configure:
    wrangler secret put CREDENTIAL_PRIVATE_KEY   # base64 PKCS#8 RSA private key (secret)
    wrangler secret put JWT_SECRET               # HS256 secret the backend signs app JWTs with (secret)
    ALLOWED_ORIGINS  (var, per env in wrangler.toml)  # comma-separated exact browser origins
  Secrets are set out of band per environment — never committed.
*/

const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' }

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env, request)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    // Refuse a browser request from a non-allowlisted origin before doing any
    // work — JWT verification and decryption never run for it. `cors` carries an
    // Access-Control-Allow-Origin only when the request's Origin is allowlisted,
    // so its absence (with an Origin present) means "disallowed browser origin".
    // A missing Origin header is a non-browser client and passes through to auth.
    const origin = request.headers.get('Origin')
    if (origin && !cors['Access-Control-Allow-Origin']) {
      return json({ status: 403, message: 'origin not allowed' }, 403, cors)
    }

    if (request.method !== 'POST') {
      return json({ status: 405, message: 'method not allowed' }, 405, cors)
    }

    // 1. Authenticate the caller by verifying the app's Bearer JWT. Without this
    //    the Worker would be an open decryption oracle for any envelope.
    const token = bearer(request)
    if (!token || !(await verifyJwt(token, env.JWT_SECRET))) {
      return json({ status: 401, message: 'unauthorized' }, 401, cors)
    }

    // 2. Read the envelope.
    let envelope = ''
    try {
      const body = await request.json()
      if (body && typeof body.encrypted_secret === 'string') envelope = body.encrypted_secret
    } catch {
      return json({ status: 400, message: 'invalid JSON body' }, 400, cors)
    }
    if (!envelope) return json({ status: 400, message: 'encrypted_secret is required' }, 400, cors)

    // 3. Decrypt with the private key that lives only here.
    try {
      const secret = await decryptEnvelope(envelope, env.CREDENTIAL_PRIVATE_KEY)
      return json({ status: 200, message: 'secret decrypted', data: { secret } }, 200, cors)
    } catch {
      return json({ status: 422, message: 'the secret could not be decrypted' }, 422, cors)
    }
  },
}

/* ── HTTP helpers ─────────────────────────────────────────────────────────── */

// Exact-match origin allowlist. The response echoes only an allowlisted request
// origin (never "*", never a *.vercel.app suffix match) and always sends
// `Vary: Origin` because the response depends on it. A disallowed browser origin
// gets no Access-Control-Allow-Origin and is blocked client-side; the JWT check
// remains the actual access boundary.
function corsHeaders(env, request) {
  const allowed = parseOrigins(env.ALLOWED_ORIGINS)
  const origin = request.headers.get('Origin') || ''
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function parseOrigins(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function bearer(request) {
  const header = request.headers.get('Authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : ''
}

/* ── JWT verification (HS256) ─────────────────────────────────────────────────
   Matches the backend contract (confirmed 2026-08-13): HS256 HMAC signed with
   JWT_SECRET; claims user_id / email / role / token_version / exp / iat; no
   iss / aud / nbf. So we verify the signature and require a live `exp`.

   Two limits are inherent to signature-only verification off the backend, and are
   accepted for this flow (see README):
     • the same JWT_SECRET can mint tokens, not just verify them (HS256);
     • `token_version` / account-status revocation is a backend DB check we can't
       reproduce — but the backend already ran it when it returned this envelope
       from get-credential-secret moments earlier, so a revoked token can't get
       an envelope to bring here in the first place. */

async function verifyJwt(token, secret) {
  if (!secret) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [h, p, sig] = parts
  try {
    const header = JSON.parse(b64urlToText(h))
    if (header.alg !== 'HS256') return false
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(`${h}.${p}`),
    )
    if (!valid) return false
    // exp is mandatory here (the backend always sets it); reject if absent or past.
    const payload = JSON.parse(b64urlToText(p))
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return false
    return true
  } catch {
    return false
  }
}

/* ── Envelope decryption ──────────────────────────────────────────────────── */

async function decryptEnvelope(envelope, privateKeyMaterial) {
  const parts = envelope.split('.')
  if (parts.length !== 5 || parts[0] !== 'owe') throw new Error('malformed envelope')
  const wrappedKey = b64ToBytes(parts[2])
  const iv = b64ToBytes(parts[3])
  const ciphertext = b64ToBytes(parts[4])

  const privateKey = await importPrivateKey(privateKeyMaterial)
  const rawAesKey = await crypto.subtle.decrypt(RSA, privateKey, wrappedKey)
  const aesKey = await crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, [
    'decrypt',
  ])
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext)
  return new TextDecoder().decode(plaintext)
}

async function importPrivateKey(material) {
  const b64 = (material || '')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (!b64) throw new Error('CREDENTIAL_PRIVATE_KEY is not configured')
  return crypto.subtle.importKey('pkcs8', b64ToBytes(b64), RSA, false, ['decrypt'])
}

/* ── base64 helpers ───────────────────────────────────────────────────────── */

function b64ToBytes(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return b64ToBytes(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
}

function b64urlToText(b64url) {
  return new TextDecoder().decode(b64urlToBytes(b64url))
}
