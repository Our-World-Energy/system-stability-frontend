import { describe, expect, it } from 'vitest'
import worker from './worker.js'

/*
  Exercises the real `fetch` handler for CORS/origin behavior. A minimal fake
  request (only `.method`, `.headers.get`, `.json` are used) keeps these off any
  global Request polyfill; the handler's real Response is inspected. None of these
  paths reach JWT verification or decryption, so no key material is involved.
*/

const A = 'https://app.example.com'
const B = 'https://app2.example.com'
const PROD = 'https://system-stability-frontend.vercel.app'
// A comma-separated list with stray spaces, to prove trimming.
const LIST = `${A}, ${B}`

function makeReq(method, origin, headers = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  if (origin !== undefined) map.set('origin', origin)
  return {
    method,
    headers: { get: (name) => (map.has(name.toLowerCase()) ? map.get(name.toLowerCase()) : null) },
    json: async () => ({}),
  }
}

const env = (ALLOWED_ORIGINS) => ({ ALLOWED_ORIGINS })

describe('decrypt Worker — CORS origin allowlist', () => {
  it('reflects an exact allowed origin on the preflight and always sets Vary: Origin', async () => {
    const res = await worker.fetch(makeReq('OPTIONS', A), env(LIST))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(A)
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('matches each of several comma-separated origins (surrounding spaces trimmed)', async () => {
    for (const origin of [A, B]) {
      const res = await worker.fetch(makeReq('OPTIONS', origin), env(LIST))
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    }
  })

  it('permits the configured production origin', async () => {
    const res = await worker.fetch(makeReq('OPTIONS', PROD), env(PROD))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PROD)
  })

  it('returns no Access-Control-Allow-Origin for a disallowed origin, but still Vary: Origin', async () => {
    const res = await worker.fetch(makeReq('OPTIONS', 'https://evil.example.com'), env(LIST))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('never echoes a wildcard', async () => {
    const allowed = await worker.fetch(makeReq('OPTIONS', A), env(LIST))
    const denied = await worker.fetch(makeReq('OPTIONS', 'https://evil.example.com'), env(LIST))
    expect(allowed.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
    expect(denied.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })

  it('does not do suffix, subdomain, scheme, or port matching', async () => {
    const attackers = [
      `${A}.evil.com`, // suffix append
      'https://evil-app.example.com', // different host
      'https://app.example.com:8443', // port differs
      'http://app.example.com', // scheme differs
      'https://sub.vercel.app', // arbitrary *.vercel.app must never match
    ]
    for (const origin of attackers) {
      const res = await worker.fetch(makeReq('OPTIONS', origin), env(`${LIST}, ${PROD}`))
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    }
  })

  it('fails closed when the allowlist is empty', async () => {
    const preflight = await worker.fetch(makeReq('OPTIONS', A), env(''))
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull()

    const post = await worker.fetch(makeReq('POST', A), env(''))
    expect(post.status).toBe(403) // refused before any work
  })

  it('handles a missing Origin (non-browser client): no ACAO, and POST is not origin-blocked', async () => {
    const preflight = await worker.fetch(makeReq('OPTIONS', undefined), env(LIST))
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull()

    // No Origin → not a disallowed browser origin → passes through to auth, so a
    // token-less POST is 401 (not the 403 a disallowed origin would get).
    const post = await worker.fetch(makeReq('POST', undefined), env(LIST))
    expect(post.status).toBe(401)
  })
})

describe('decrypt Worker — disallowed origin refused before JWT/decrypt', () => {
  it('a disallowed-origin POST is 403 (not 401), proving the origin check precedes JWT', async () => {
    // No Authorization header: were the origin check not first, this would be 401.
    const res = await worker.fetch(makeReq('POST', 'https://evil.example.com'), env(LIST))
    expect(res.status).toBe(403)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('an allowed-origin POST with no token still reaches JWT verification (401)', async () => {
    const res = await worker.fetch(makeReq('POST', A), env(LIST))
    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(A)
  })
})
