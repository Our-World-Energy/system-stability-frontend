// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { useSessionWatch } from './useSessionWatch'
import { getRequestStats } from '@/lib/api/stats'
import { TOKEN_KEY } from '@/lib/auth-storage'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/api/stats', () => ({ getRequestStats: vi.fn() }))

const mockGetRequestStats = vi.mocked(getRequestStats)

function Watcher() {
  useSessionWatch()
  return null
}

/** A session as the store holds one after a successful login. */
function signedIn() {
  localStorage.setItem(TOKEN_KEY, 'jwt')
  useAuthStore.setState({
    token: 'jwt',
    user: { email: 'ops@ourworldenergy.com', role: 'platform_admin', roleLabel: 'Platform Admin' },
    mustChangePassword: false,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  mockGetRequestStats.mockResolvedValue({
    pending_count: 0,
    granted_count: 0,
    denied_count: 0,
    expired_count: 0,
    volume_by_hour: [],
  })
  useAuthStore.setState({ token: null, user: null, mustChangePassword: false })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useSessionWatch', () => {
  it('probes once on mount so a parked tab still asks the API something', () => {
    signedIn()
    render(<Watcher />)

    // Without this the Dashboard makes no protected call at all, and a session
    // invalidated by a role change would go unnoticed until the user navigated.
    expect(mockGetRequestStats).toHaveBeenCalledTimes(1)
  })

  it('stays quiet when nobody is signed in', () => {
    render(<Watcher />)
    expect(mockGetRequestStats).not.toHaveBeenCalled()
  })

  it('re-probes when the tab is brought back to the front', () => {
    signedIn()
    render(<Watcher />)
    mockGetRequestStats.mockClear()

    // Straight away, a focus is folded into the probe that just ran.
    act(() => void window.dispatchEvent(new Event('focus')))
    expect(mockGetRequestStats).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(61_000))
    act(() => void window.dispatchEvent(new Event('focus')))
    expect(mockGetRequestStats).toHaveBeenCalled()
  })

  it('keeps probing a tab that is never left', () => {
    signedIn()
    render(<Watcher />)
    mockGetRequestStats.mockClear()

    act(() => vi.advanceTimersByTime(5 * 60_000))

    expect(mockGetRequestStats).toHaveBeenCalledTimes(1)
  })

  it('follows another tab that has ended the session', () => {
    signedIn()
    render(<Watcher />)

    // What a 401 in a second tab leaves behind: the shared token, removed.
    act(
      () =>
        void window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: null })),
    )

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('stops probing once unmounted', () => {
    signedIn()
    const { unmount } = render(<Watcher />)
    unmount()
    mockGetRequestStats.mockClear()

    act(() => vi.advanceTimersByTime(15 * 60_000))

    expect(mockGetRequestStats).not.toHaveBeenCalled()
  })
})
