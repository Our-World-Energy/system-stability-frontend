/*
  Constants for the admin-facing Credential Management console.

  The record list and the two-factor method list used to live here as mock data.
  Both are now served by the API — records come from
  `credential-manager/search-credentials` (typed in `lib/api/types.ts`), and the
  method list is `twoFactorOptions` in `lib/api/credentials.ts`, because each
  entry carries the value the backend stores.
*/

/** Encryption scheme surfaced on the purge dialog. */
export const ENCRYPTION_SCHEME = 'AES-256-GCM'
