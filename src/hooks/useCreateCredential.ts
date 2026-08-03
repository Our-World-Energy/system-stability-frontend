import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCredential, credentialErrorMessage } from '@/lib/api/credentials'
import type { CreatedCredential, CredentialDraft } from '@/lib/api/credentials'
import type { ApiEnvelope } from '@/lib/api/caller'
import { credentialKeys } from '@/lib/api/query-keys'
import { notify } from '@/lib/notify'

interface UseCreateCredentialOptions {
  onSuccess?: (result: ApiEnvelope<CreatedCredential>, draft: CredentialDraft) => void
}

/**
 * Encrypt-and-create a credential record.
 *
 * Owns the pending state the modal renders, and raises the toast for either
 * outcome — so the outcome is reported the same way wherever a create is
 * triggered from, and a caller only has to handle what is specific to it. On
 * success it also invalidates the record list so a table reading from the API
 * refreshes itself.
 */
export function useCreateCredential({ onSuccess }: UseCreateCredentialOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: CredentialDraft) => createCredential(draft),
    // Retrying a create risks a duplicate record, and the QueryClient default is
    // two retries — so opt out explicitly.
    retry: false,
    onSuccess: (result, draft) => {
      // Prefer the service's own wording; it may say more than "created".
      notify.success(result.message?.trim() || 'Credential created.')
      void queryClient.invalidateQueries({ queryKey: credentialKeys.all })
      onSuccess?.(result, draft)
    },
    onError: (err) => notify.error(credentialErrorMessage(err)),
  })
}
