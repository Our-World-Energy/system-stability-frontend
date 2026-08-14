#!/usr/bin/env node
/*
  Generate the RSA-OAEP keypair used to encrypt credential secrets in the browser.

    node scripts/gen-credential-keys.mjs          # print env lines
    node scripts/gen-credential-keys.mjs --pem    # also print PEM blocks

  The PUBLIC line goes into .env as VITE_CREDENTIAL_PUBLIC_KEY. The PRIVATE key
  goes to the decryption Worker (workers/decrypt), never into a Vite env — a
  private key in a VITE_ var is compiled into the public bundle. Set it with:

    wrangler secret put CREDENTIAL_PRIVATE_KEY   # paste the base64, or the --pem block

  Keys are base64 DER on one line each, because .env cannot hold PEM newlines.
*/

import { webcrypto } from 'node:crypto'

const MODULUS_BITS = 3072
const args = new Set(process.argv.slice(2))

const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: MODULUS_BITS,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: 'SHA-256',
  },
  true,
  ['encrypt', 'decrypt'],
)

const spki = await exportBase64('spki', publicKey)
const pkcs8 = await exportBase64('pkcs8', privateKey)

console.log(`# RSA-OAEP ${MODULUS_BITS} / SHA-256 — generated ${new Date().toISOString()}`)
console.log('\n# → app .env — the public half only:')
console.log(`VITE_CREDENTIAL_PUBLIC_KEY=${spki}`)
console.log('\n# → decryption Worker secret (NOT any .env):')
console.log('#   wrangler secret put CREDENTIAL_PRIVATE_KEY')
console.log(pkcs8)

if (args.has('--pem')) {
  console.log(`\n${toPem('PUBLIC KEY', spki)}`)
  console.log(toPem('PRIVATE KEY', pkcs8))
}

console.log(
  '\n# The private key belongs only on the Worker — never in git or a build.' +
    '\n# Rotating the pair makes every already-stored encrypted_secret unrecoverable.',
)

async function exportBase64(format, key) {
  const der = await webcrypto.subtle.exportKey(format, key)
  return Buffer.from(der).toString('base64')
}

function toPem(label, base64) {
  const body = base64.match(/.{1,64}/g).join('\n')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}
