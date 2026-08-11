// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth'
import type { RoleKey } from '@/lib/api/user-management.types'
import type { Credential } from '@/lib/api/types'
import { RotateCredentialModal } from './RotateCredentialModal'

const rotateMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}))

vi.mock('@/hooks/useCredentials', () => ({
  useRotateCredential: () => rotateMutation,
}))

vi.mock('@/lib/crypto/keys', () => ({
  isEncryptionConfigured: () => true,
}))

const record = {
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
} satisfies Credential

function signInAs(role: RoleKey): void {
  useAuthStore.setState({
    user: {
      email: 'admin@ourworldenergy.com',
      role,
      roleLabel: role,
    },
  })
}

function renderModal() {
  return render(<RotateCredentialModal record={record} onClose={vi.fn()} />)
}

beforeEach(() => {
  rotateMutation.mutate.mockReset()
  signInAs('org_admin')
})

afterEach(() => {
  cleanup()
  useAuthStore.setState({ user: null })
})

describe('RotateCredentialModal metadata permissions', () => {
  it('shows metadata controls to the organizational admin', () => {
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /update other details/i }))
    expect(screen.getByLabelText('Username')).toBeTruthy()
    expect(screen.getByLabelText('URL')).toBeTruthy()
    expect(screen.getByLabelText('2FA Type')).toBeTruthy()
    expect(screen.getByLabelText('Notes')).toBeTruthy()
  })

  it.each(['platform_admin', 'dev_admin'] satisfies RoleKey[])(
    'hides metadata controls from the %s',
    (role) => {
      signInAs(role)
      renderModal()

      expect(screen.queryByRole('button', { name: /update other details/i })).toBeNull()
      expect(screen.queryByLabelText('Username')).toBeNull()
    },
  )

  it('strips retained metadata if the role changes before submission', () => {
    const view = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /update other details/i }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'changed-user' } })

    act(() => signInAs('platform_admin'))
    view.rerender(<RotateCredentialModal record={record} onClose={vi.fn()} />)
    expect(screen.queryByLabelText('Username')).toBeNull()

    fireEvent.change(screen.getByLabelText('New Secret / Password'), {
      target: { value: 'new-secret' },
    })
    fireEvent.change(screen.getByLabelText('Confirm New Secret'), {
      target: { value: 'new-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^rotate credential$/i }))

    expect(rotateMutation.mutate).toHaveBeenCalledWith({
      id: record.id,
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      username: '',
      url: '',
      twoFactorType: 'unchanged',
      twoFactorApprover: '',
      notes: '',
    })
  })
})
