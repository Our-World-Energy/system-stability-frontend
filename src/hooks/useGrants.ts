/*
  Grant hooks. Only revocation exists as a route of its own — grants are
  otherwise created inside submit-request / review-request.
*/

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { revokeGrant } from '@/lib/api/grants'
import { requestErrorMessage } from '@/lib/api/requests'
import { requestKeys, statsKeys } from '@/lib/api/query-keys'
import { notify } from '@/lib/notify'
import type { Grant } from '@/lib/api/types'

interface RevokeOptions {
  onSuccess?: (grant: Grant) => void
}

/** End an active grant now. The user loses access as soon as this resolves. */
export function useRevokeGrant({ onSuccess }: RevokeOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (grantId: string) => revokeGrant(grantId),
    retry: false,
    onSuccess: (result) => {
      notify.success(result.message?.trim() || 'Grant revoked.')
      void queryClient.invalidateQueries({ queryKey: requestKeys.all })
      void queryClient.invalidateQueries({ queryKey: statsKeys.all })
      onSuccess?.(result.data)
    },
    onError: (err) => notify.error(requestErrorMessage(err, 'The grant could not be revoked.')),
  })
}
