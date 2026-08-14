# Credential Decryption Worker

Holds the RSA **private key** so it never ships in the frontend bundle. The app
sends an encrypted secret envelope here; the Worker verifies the caller's JWT,
decrypts, and returns the plaintext.

```
Browser ──1─► Backend  get-credential-secret   → { encrypted_secret }   (authorizes + audits the copy)
Browser ──2─► Worker   POST /decrypt           → { data: { secret } }   (holds the key, verifies the JWT)
```

The envelope scheme mirrors `src/lib/crypto` exactly (AES-256-GCM under an
RSA-OAEP-SHA256-wrapped key, base64 parts), so no key rotation is needed to adopt
this — the **same keypair** already in use keeps working. The public half stays in
the app (`VITE_CREDENTIAL_PUBLIC_KEY`); the private half moves here.

## Configure

The keypair comes from `node scripts/gen-credential-keys.mjs` in the app repo.

```sh
cd workers/decrypt
npm i -g wrangler            # or: npx wrangler ...

# The private key — paste the base64 PKCS#8 block when prompted:
wrangler secret put CREDENTIAL_PRIVATE_KEY

# The backend's HS256 JWT secret (env var JWT_SECRET on the backend), so the
# Worker can verify callers. Confirmed with the backend team 2026-08-13: the app
# JWT is HS256, 8-hour lifetime, claims user_id/email/role/token_version/exp/iat,
# no iss/aud. There is no RS256/JWKS option on the backend today.
wrangler secret put JWT_SECRET
```

Set the CORS origin in `wrangler.toml` (`ALLOWED_ORIGIN`) to the deployed app's
origin when you have it.

## Run & deploy

```sh
wrangler dev            # local, on http://localhost:8787
wrangler deploy         # → https://owe-credential-decrypt.<account>.workers.dev
```

## Point the app at it

Set in the app's environment (e.g. `.env.production` or the Vercel dashboard):

```
VITE_DECRYPT_WORKER_URL=https://owe-credential-decrypt.<account>.workers.dev/decrypt
```

For local development, run `wrangler dev` and use
`VITE_DECRYPT_WORKER_URL=http://localhost:8787/decrypt`.

## Contract

```
POST /decrypt
  Authorization: Bearer <app JWT>
  { "encrypted_secret": "owe.v1.<wrapped>.<iv>.<ciphertext>" }

200  { "status": 200, "message": "secret decrypted", "data": { "secret": "…" } }
401  unauthorized (missing/invalid JWT)
400  bad request (no/!string encrypted_secret)
422  could not decrypt (wrong key, tampered, or malformed envelope)
```

## Security notes

- The private key exists only as a Worker secret — never in the app bundle, never in git.
- Every decrypt requires a valid app JWT; the backend still authorizes *which*
  credential a user can fetch (`get-credential-secret`) and logs each copy (with the
  real browser IP + user agent), so the Worker is a decrypt step, not the
  access-control boundary.
- The Worker returns plaintext over HTTPS to the browser, which copies it to the
  clipboard and drops it — nothing is stored.

### Two accepted risks (backend team, 2026-08-13)

- **Shared HS256 secret.** Because the app JWT is HS256, `JWT_SECRET` here is the
  *same* secret that signs tokens — this Worker (and Cloudflare's secret store)
  could technically mint valid app JWTs, not just verify them. The backend exposes
  no verify-only (RS256/JWKS) key. Mitigation: restrict who can access this
  Cloudflare account/secret; if the backend later adds an asymmetric verify key,
  switch the Worker to it.
- **Revocation gap.** The backend re-checks `token_version` / account status
  against its DB on every request; a signature-only verifier here cannot. This is
  acceptable for *this* flow because the backend already ran that check when it
  returned the envelope from `get-credential-secret` moments earlier — a revoked
  token can't obtain an envelope to bring here. (If the Worker's contract is ever
  reused for something the backend hasn't just authorized, revisit this.)
