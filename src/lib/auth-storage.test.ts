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

describe('remember me', () => {
  it('keeps a remembered session where a browser restart can find it', async () => {
    const { TOKEN_KEY, readSession, writeSession } = await loadStorage()

    writeSession(TOKEN_KEY, 'jwt', true)

    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(readSession(TOKEN_KEY)).toBe('jwt')
  })

  it('keeps an unremembered session in the tab, where closing it ends the session', async () => {
    const { TOKEN_KEY, readSession, writeSession } = await loadStorage()

    writeSession(TOKEN_KEY, 'jwt', false)

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('jwt')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    // The axios interceptor cannot know which box was ticked, so it must find
    // either one.
    expect(readSession(TOKEN_KEY)).toBe('jwt')
  })

  it('never leaves the same key in both stores', async () => {
    const { TOKEN_KEY, writeSession } = await loadStorage()

    writeSession(TOKEN_KEY, 'remembered', true)
    writeSession(TOKEN_KEY, 'this-tab-only', false)

    // Otherwise a signed-out-but-remembered token would sit in the store nobody
    // is reading, and come back on the next reload.
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('this-tab-only')
  })

  it('clears a session out of whichever store held it', async () => {
    const { TOKEN_KEY, USER_KEY, clearStoredSession, writeSession } = await loadStorage()
    writeSession(TOKEN_KEY, 'jwt', false)
    writeSession(USER_KEY, '{}', true)

    clearStoredSession()

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  it('defaults to remembering, which is what the app did before the box existed', async () => {
    const { isRemembered } = await loadStorage()
    expect(isRemembered()).toBe(true)
  })

  it('offers the address back only while the box stays ticked', async () => {
    const { isRemembered, rememberedEmail, setRemembered } = await loadStorage()

    setRemembered(true, 'ops@ourworldenergy.com')
    expect(rememberedEmail()).toBe('ops@ourworldenergy.com')
    expect(isRemembered()).toBe(true)

    setRemembered(false, 'ops@ourworldenergy.com')
    expect(rememberedEmail()).toBe('')
    expect(isRemembered()).toBe(false)
  })

  it('outlives signing out — it describes the next sign-in, not this one', async () => {
    const { TOKEN_KEY, clearStoredSession, rememberedEmail, setRemembered, writeSession } =
      await loadStorage()
    setRemembered(true, 'ops@ourworldenergy.com')
    writeSession(TOKEN_KEY, 'jwt', true)

    clearStoredSession()

    expect(rememberedEmail()).toBe('ops@ourworldenergy.com')
  })
})
