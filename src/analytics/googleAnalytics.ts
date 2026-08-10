/*
  The one place this app talks to GA4.

  The tag itself is loaded once, from index.html, with `send_page_view: false` —
  automatic page views count a SPA's route changes wrong, so every page view here
  is sent by hand from `usePageTracking`. Nothing else in the app should call
  `window.gtag` directly.

  Identity is `String(users.id)` and nothing else. The backend's GA query reads
  `customUser:user_code`, so that property name is a contract, not a preference:
  rename it and the sync job matches no rows and the Active Users chart stays at
  zero. Email, names and tokens must never be sent — GA4 is not a place for PII.
*/

/**
 * The System Stability web stream. Must stay identical to the id in index.html —
 * `googleAnalytics.test.ts` fails the build if the two drift apart.
 *
 * Deliberately not an env var: owehub has its own property, and an environment
 * that silently supplied the wrong id would merge two applications' traffic with
 * nothing to notice it.
 */
export const GA_MEASUREMENT_ID = 'G-HHY7CK0XT4'

type GtagArgs = [command: string, ...args: unknown[]]

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: GtagArgs) => void
  }
}

/**
 * False when the tag never loaded — a blocked script, a test, an ad blocker.
 * Everything below no-ops in that case rather than throwing: analytics is not
 * worth breaking a page over.
 */
export function isAnalyticsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID)
  )
}

function gtag(...args: GtagArgs): void {
  if (isAnalyticsEnabled()) window.gtag!(...args)
}

/** One `page_view` per SPA route, including the first. */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title ?? document.title,
  })
}

/**
 * Attach the signed-in user to everything sent from here on.
 *
 * `userId` must be `String(users.id)`. `send_page_view: false` is repeated on the
 * re-config because `config` re-applies the tag's defaults — omitting it would
 * turn automatic page views back on and double-count every route.
 */
export function setAnalyticsUser(userId: string, properties: Record<string, unknown> = {}): void {
  const id = userId.trim()
  if (!id) return

  gtag('set', { user_id: id })
  gtag('config', GA_MEASUREMENT_ID, { user_id: id, send_page_view: false })
  gtag('set', 'user_properties', {
    // Exactly this key — the backend reads `customUser:user_code`.
    user_code: id,
    ...properties,
  })
}

/**
 * Drop the identity at sign-out, so events from the logged-out screen — or from
 * whoever signs in next on a shared browser — are not still labelled with the
 * previous user.
 */
export function clearAnalyticsUser(): void {
  gtag('set', { user_id: null })
  gtag('config', GA_MEASUREMENT_ID, { user_id: null, send_page_view: false })
  gtag('set', 'user_properties', { user_code: null, role: null })
}
