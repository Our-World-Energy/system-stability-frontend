// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RotationQueue } from './RotationQueue'

const review = vi.hoisted(() => ({ isPending: false, mutate: vi.fn() }))
const request = vi.hoisted(() => ({
  id: 'rotation-1',
  credential_id: 'credential-1',
  request_type: 'rotation',
  credential_name: 'AWS Production Root',
  requested_by: 'Priya Nair',
  reason_category: 'maintenance',
  justification: 'Quarterly credential rotation.',
  requested_at: '2026-08-11T08:00:00Z',
  wait_minutes: 10,
  is_sla_breach: false,
}))

vi.mock('@/hooks/useRequests', () => ({
  usePendingRotationRequests: () => ({
    data: { total: 1, page: 1, page_size: 25, items: [request] },
    isError: false,
    isLoading: false,
  }),
  useReviewRotationRequest: () => review,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RotationQueue review dialog', () => {
  it('requires and submits a denial reason for a rotation denial', () => {
    render(<RotationQueue />)
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))

    const dialog = screen.getByRole('dialog', { name: /deny rotation request/i })
    const deny = within(dialog).getByRole('button', { name: 'Deny' })
    fireEvent.click(deny)

    expect(review.mutate).not.toHaveBeenCalled()
    expect(within(dialog).getByText(/reason is required/i)).toBeTruthy()

    fireEvent.change(within(dialog).getByLabelText(/denial reason/i), {
      target: { value: 'The proposed rotation does not meet policy.' },
    })
    fireEvent.click(deny)

    expect(review.mutate).toHaveBeenCalledWith({
      requestId: request.id,
      action: 'deny',
      denialReason: 'The proposed rotation does not meet policy.',
    })
  })

  it('keeps approval free of denial fields', () => {
    render(<RotationQueue />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    const dialog = screen.getByRole('dialog', { name: /approve rotation request/i })
    expect(within(dialog).queryByLabelText(/denial reason/i)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(review.mutate).toHaveBeenCalledWith({ requestId: request.id, action: 'approve' })
  })
})
