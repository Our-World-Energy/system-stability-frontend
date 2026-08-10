// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// The real file, not a copy of it: the point of these two assertions is that the
// page and this module cannot drift apart.
import indexHtml from '../../index.html?raw'
import {
  GA_MEASUREMENT_ID,
  clearAnalyticsUser,
  isAnalyticsEnabled,
  setAnalyticsUser,
  trackPageView,
} from './googleAnalytics'

const gtag = vi.fn()

beforeEach(() => {
  gtag.mockClear()
  window.gtag = gtag
})

afterEach(() => {
  delete window.gtag
})

/** Every call the wrapper made whose first argument is `command`. */
function calls(command: string) {
  return gtag.mock.calls.filter(([first]) => first === command)
}

describe('the measurement id', () => {
  it('is the one index.html loads the tag with', () => {
    // §4.2 of the integration guide: one file using System Stability's id while
    // the other still has owehub's would split the data with nothing to notice.
    const ids = [...indexHtml.matchAll(/G-[A-Z0-9]+/g)].map((match) => match[0])

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids)).toEqual(new Set([GA_MEASUREMENT_ID]))
  })

  it('leaves automatic page views off in index.html', () => {
    // Otherwise gtag counts the initial load and the observer counts it again.
    expect(indexHtml).toMatch(/send_page_view:\s*false/)
  })
})

describe('setAnalyticsUser', () => {
  it('sends the numeric id as user_id and as user_code', () => {
    setAnalyticsUser('42', { role: 'org_admin' })

    expect(calls('set')[0][1]).toEqual({ user_id: '42' })
    expect(calls('config')[0]).toEqual([
      'config',
      GA_MEASUREMENT_ID,
      { user_id: '42', send_page_view: false },
    ])
    // The backend's GA query reads `customUser:user_code` — this key is a contract.
    expect(calls('set')[1]).toEqual([
      'set',
      'user_properties',
      { user_code: '42', role: 'org_admin' },
    ])
  })

  it('keeps automatic page views off when it re-configures the tag', () => {
    setAnalyticsUser('42')

    for (const call of calls('config')) {
      expect(call[2]).toMatchObject({ send_page_view: false })
    }
  })

  it('ignores an empty id rather than sending a blank identity', () => {
    setAnalyticsUser('   ')
    expect(gtag).not.toHaveBeenCalled()
  })

  it('never lets an email reach GA', () => {
    setAnalyticsUser('42', { role: 'org_admin' })

    const sent = JSON.stringify(gtag.mock.calls)
    expect(sent).not.toMatch(/@/)
  })
})

describe('clearAnalyticsUser', () => {
  it('drops the identity and the user property together', () => {
    clearAnalyticsUser()

    expect(calls('set')[0][1]).toEqual({ user_id: null })
    expect(calls('config')[0][2]).toEqual({ user_id: null, send_page_view: false })
    expect(calls('set')[1][2]).toEqual({ user_code: null, role: null })
  })
})

describe('trackPageView', () => {
  it('sends one page_view carrying the path and query', () => {
    trackPageView('/users?tab=registry')

    const events = calls('event')
    expect(events).toHaveLength(1)
    expect(events[0][1]).toBe('page_view')
    expect(events[0][2]).toMatchObject({ page_path: '/users?tab=registry' })
  })
})

describe('when the tag never loaded', () => {
  it('no-ops instead of throwing', () => {
    delete window.gtag

    expect(isAnalyticsEnabled()).toBe(false)
    expect(() => {
      setAnalyticsUser('42')
      trackPageView('/users')
      clearAnalyticsUser()
    }).not.toThrow()
    expect(gtag).not.toHaveBeenCalled()
  })
})
