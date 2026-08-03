#!/usr/bin/env node
/*
  Generate the RSA-OAEP keypair used to encrypt credential secrets in the browser.

    node scripts/gen-credential-keys.mjs          # print env lines
    node scripts/gen-credential-keys.mjs --pem    # also print PEM blocks

  Paste the two printed VITE_ lines into .env. Keys are base64 DER on one line
  each, because .env cannot hold the newlines a PEM block needs.

  The private key is only needed by src/lib/crypto/secret-decrypt.ts, the
  temporary local round-trip helper. When decryption moves to a Cloudflare
  Worker, give the Worker the PEM (`--pem`) and delete the VITE_ private key line
  — a private key in a Vite env var is compiled into the public bundle.
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
console.log(`VITE_CREDENTIAL_PUBLIC_KEY=${spki}`)
console.log(`VITE_CREDENTIAL_PRIVATE_KEY=${pkcs8}`)

if (args.has('--pem')) {
  console.log(`\n${toPem('PUBLIC KEY', spki)}`)
  console.log(toPem('PRIVATE KEY', pkcs8))
}

console.log(
  '\n# Keep the private key out of git and out of any production build.' +
    '\n# Rotating it makes every already-stored encrypted_secret unrecoverable.',
)

async function exportBase64(format, key) {
  const der = await webcrypto.subtle.exportKey(format, key)
  return Buffer.from(der).toString('base64')
}

function toPem(label, base64) {
  const body = base64.match(/.{1,64}/g).join('\n')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}
