/*
  Credential-manager data hooks: search, rotate, delete.

  Creation lives in `useCreateCredential.ts` because it owns the encryption path
  and a good deal more validation; everything else is here.

  Each mutation raises its own toast and invalidates the searches, so a caller
  only handles what is specific to it — closing a dialog, clearing a selection.
*/

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  credentialErrorMessage,
  deleteCredential,
  requestCredentialRotation,
  revealCredentialDetails,
  revealCredentialSecret,
  rotateCredential,
  searchCredentials,
} from '@/lib/api/credentials'
import type {
  RevealedCredential,
  RotateCredentialDraft,
  RotationRequestDraft,
} from '@/lib/api/credentials'
import { credentialKeys } from '@/lib/api/query-keys'
import { notify } from '@/lib/notify'
import type { Credential } from '@/lib/api/types'

/**
 * Live credential search.
 *
 * The service has no list-everything route — `q` is required — so an empty query
 * resolves to an empty list without a request, and the caller is expected to
 * prompt for a search term rather than show a bare table.
 */
export function useCredentialSearch(query: string) {
  const term = query.trim()
  const result = useQuery({
    queryKey: credentialKeys.search(term),
    queryFn: () => searchCredentials(term),
    enabled: term.length > 0,
    // Results back a table the admin acts on; a stale row would offer a rotate
    // for something already deleted elsewhere.
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  })

  // Surface a failed search as a toast, not just the inline table message — the
  // effect keys on the error, so a persistent failure toasts once, not per render.
  useEffect(() => {
    if (result.isError) {
      notify.error(credentialErrorMessage(result.error, 'Credential search failed. Please try again.'))
    }
  }, [result.isError, result.error])

  return result
}

interface RotateOptions {
  onSuccess?: (credential: Credential) => void
}

/** Replace a credential's secret, optionally amending its metadata. */
export function useRotateCredential({ onSuccess }: RotateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: RotateCredentialDraft) => rotateCredential(draft),
    retry: false,
    onSuccess: (result) => {
      notify.success(result.message?.trim() || 'Credential rotated.')
      void queryClient.invalidateQueries({ queryKey: credentialKeys.all })
      onSuccess?.(result.data)
    },
    onError: (err) => notify.error(credentialErrorMessage(err, 'The credential was not rotated.')),
  })
}

interface RequestRotationOptions {
  onSuccess?: () => void
}

/**
 * Submit a rotation request for roles that may ask but not rotate (Executive,
 * Management). The new secret is encrypted in `requestCredentialRotation` before
 * it leaves the browser; here we only own the pending state and the toast.
 */
export function useRequestRotation({ onSuccess }: RequestRotationOptions = {}) {
  return useMutation({
    mutationFn: (draft: RotationRequestDraft) => requestCredentialRotation(draft),
    retry: false,
    onSuccess: (result) => {
      notify.success(result.message?.trim() || 'Rotation request submitted for approval.')
      onSuccess?.()
    },
    onError: (err) =>
      notify.error(credentialErrorMessage(err, 'The rotation request was not submitted.')),
  })
}

interface RevealOptions {
  onSuccess?: (plaintext: string) => void
}

/**
 * Fetch and decrypt a credential's secret for a one-off use — the admin copy
 * button.
 *
 * Deliberately a mutation rather than a query: a query would park the plaintext
 * in the React Query cache, where it would linger and be replayed to any later
 * subscriber. Here it is produced on demand and handed to `onSuccess`.
 *
 * The mutation still holds the value in `mutation.data` afterwards, so callers
 * should `reset()` once they have used it — see `SecretCell`.
 */
export function useRevealSecret({ onSuccess }: RevealOptions = {}) {
  return useMutation({
    mutationFn: (id: string) => revealCredentialSecret(id),
    retry: false,
    onSuccess: (plaintext) => onSuccess?.(plaintext),
    onError: (err) =>
      notify.error(credentialErrorMessage(err, 'The secret could not be retrieved.')),
  })
}

interface RevealDetailsOptions {
  onSuccess?: (details: RevealedCredential) => void
}

/**
 * Fetch and decrypt a credential's secret *with* its descriptive fields, for the
 * requester's reveal dialog (auto-access or a granted request).
 *
 * A mutation for the same reason as `useRevealSecret`: the plaintext is produced
 * on demand and handed to `onSuccess` rather than parked in the query cache. The
 * caller holds it only while the dialog is open and drops it on close.
 */
export function useRevealCredentialDetails({ onSuccess }: RevealDetailsOptions = {}) {
  return useMutation({
    mutationFn: (id: string) => revealCredentialDetails(id),
    retry: false,
    onSuccess: (details) => onSuccess?.(details),
    onError: (err) =>
      notify.error(credentialErrorMessage(err, 'The secret could not be retrieved.')),
  })
}

interface DeleteOptions {
  onSuccess?: () => void
}

/** Permanently remove a credential. Hard delete — nothing to undo afterwards. */
export function useDeleteCredential({ onSuccess }: DeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    retry: false,
    onSuccess: () => {
      notify.success('Credential deleted.')
      void queryClient.invalidateQueries({ queryKey: credentialKeys.all })
      onSuccess?.()
    },
    onError: (err) => notify.error(credentialErrorMessage(err, 'The credential was not deleted.')),
  })
}
