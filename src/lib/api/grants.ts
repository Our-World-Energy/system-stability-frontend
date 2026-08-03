/*
  Issued grants. The only route today is revocation — grants are otherwise
  created as a side effect of submitting or reviewing a request, and arrive
  inside that call's response.
*/

import { stabilityCaller } from './caller'
import { endpoints } from './endpoints'
import type { ApiEnvelope } from './caller'
import type { Grant } from './types'

/**
 * End an active grant immediately, before its timer runs out. The user loses
 * access as soon as this returns; the grant comes back with `status: 'revoked'`
 * and a `revoked_at` stamp rather than being deleted.
 */
export async function revokeGrant(grantId: string): Promise<ApiEnvelope<Grant>> {
  if (!grantId) throw new Error('No grant selected.')
  return stabilityCaller<Grant>(endpoints.credentialManager.revokeGrant, { grant_id: grantId })
}
