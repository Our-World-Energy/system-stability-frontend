// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPendingRotationRequests, submitAccessRequest } = vi.hoisted(() => ({
  getPendingRotationRequests: vi.fn(),
  submitAccessRequest: vi.fn(),
}))
vi.mock('@/lib/api/requests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/requests')>()
  return { ...actual, getPendingRotationRequests, submitAccessRequest }
})

import { credentialKeys } from '@/lib/api/query-keys'
import type { Credential } from '@/lib/api/types'
import { usePendingRotationRequests, useSubmitRequest } from './useRequests'

let queryClient: QueryClient

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  getPendingRotationRequests.mockReset()
  getPendingRotationRequests.mockResolvedValue({ total: 0, page: 1, page_size: 25, items: [] })
  submitAccessRequest.mockReset()
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.useRealTimers()
})

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('usePendingRotationRequests', () => {
  it('refreshes the rotation queue every 30 seconds while enabled', async () => {
    renderHook(() => usePendingRotationRequests(1, 25), { wrapper: Wrapper })
    await waitFor(() => expect(getPendingRotationRequests).toHaveBeenCalledTimes(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    await waitFor(() => expect(getPendingRotationRequests).toHaveBeenCalledTimes(2))
  })

  it('does not call the org-admin route while disabled', async () => {
    renderHook(() => usePendingRotationRequests(1, 25, false), { wrapper: Wrapper })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(getPendingRotationRequests).not.toHaveBeenCalled()
  })
})

describe('useSubmitRequest', () => {
  it('marks the matching cached credential pending as soon as a request is queued', async () => {
    const searchKey = credentialKeys.search('aws')
    const credential = {
      id: 'cred-1',
      name: 'AWS Production',
      username: 'api-user',
      elevation_duration_seconds: 3600,
      auto_grant: false,
      status: 'active',
      created_by: 18,
      updated_by: 18,
      created_at: '2026-08-11T09:00:00Z',
      updated_at: '2026-08-11T09:00:00Z',
      has_auto_access: false,
    } satisfies Credential
    queryClient.setQueryData(searchKey, [credential])
    submitAccessRequest.mockResolvedValue({
      status: 200,
      message: 'request submitted',
      data: {
        request: {
          id: 'request-42',
          credential_id: credential.id,
          requested_by: 18,
          reason_category: 'deployment',
          justification: 'Production deployment',
          status: 'pending',
          requested_at: '2026-08-11T09:15:00Z',
        },
        grant: null,
      },
    })
    const { result } = renderHook(() => useSubmitRequest(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        credentialId: credential.id,
        reasonCategory: 'deployment',
        justification: 'Production deployment',
        beneficiaryEmail: '',
      })
    })

    expect(queryClient.getQueryData<Credential[]>(searchKey)).toEqual([
      {
        ...credential,
        request_status: 'pending',
        request_id: 'request-42',
        grant: null,
      },
    ])
  })
})
