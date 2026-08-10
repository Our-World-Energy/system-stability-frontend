// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
  `endSession` navigates, and it guards against navigating twice — module state
  that has to start clean for each case, hence the re-import per test.
*/
async function loadStorage() {
  vi.resetModules()
  return import('./auth-storage')
}

/** Stand in for the real Location, whose href assignment jsdom cannot follow. */
function stubLocation(pathname: string) {
  const location = { pathname, href: `http://localhost${pathname}` }
  Object.defineProperty(window, 'location', { configurable: true, value: location })
  return location
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  stubLocation('/users')
})

describe('endSession', () => {
  it('clears the stored session and bounces to login', async () => {
    const { TOKEN_KEY, USER_KEY, endSession } = await loadStorage()
    localStorage.setItem(TOKEN_KEY, 'jwt')
    localStorage.setItem(USER_KEY, '{"email":"ops@ourworldenergy.com"}')
    const location = stubLocation('/users')

    endSession('Signed out.')

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    // The cached profile goes with the token: it carries the role the sidebar
    // renders, which is exactly what a role change has just made wrong.
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(location.href).toBe('/login')
  })

  it('navigates once however many calls a burst of 401s makes', async () => {
    const { endSession } = await loadStorage()
    const location = stubLocation('/users')

    endSession('Signed out.')
    location.href = '/still-here' // Would be overwritten by a second navigation.
    endSession('Signed out.')

    expect(location.href).toBe('/still-here')
  })

  it('clears but does not redirect when already on the login screen', async () => {
    const { TOKEN_KEY, endSession, takeSessionNotice } = await loadStorage()
    localStorage.setItem(TOKEN_KEY, 'jwt')
    const location = stubLocation('/login')

    // A 401 here is a rejected sign-in for the form to render, not a session end.
    endSession('Signed out.')

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(location.href).toBe('http://localhost/login')
    expect(takeSessionNotice()).toBeNull()
  })
})

describe('takeSessionNotice', () => {
  it('hands the notice over exactly once', async () => {
    const { SESSION_ENDED_NOTICE, endSession, takeSessionNotice } = await loadStorage()
    stubLocation('/users')

    endSession(SESSION_ENDED_NOTICE)

    expect(takeSessionNotice()).toBe(SESSION_ENDED_NOTICE)
    // A later visit to /login is not still explaining an old sign-out.
    expect(takeSessionNotice()).toBeNull()
  })

  it('names both reasons, since the 401 does not tell them apart', async () => {
    const { SESSION_ENDED_NOTICE } = await loadStorage()
    expect(SESSION_ENDED_NOTICE).toMatch(/expired/i)
    expect(SESSION_ENDED_NOTICE).toMatch(/access was changed/i)
  })
})
