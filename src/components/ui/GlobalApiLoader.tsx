import { useEffect, useRef, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

const SHOW_DELAY_MS = 180
const MIN_VISIBLE_MS = 500

/**
 * Application-wide API activity indicator.
 *
 * React Query already owns the request lifecycle across the app, so observing its
 * fetch and mutation counts gives every screen one consistent loader without
 * coupling page components to global presentation. A short delay removes flashes
 * for cached/fast responses; a minimum visible time prevents a jarring blink.
 */
export function GlobalApiLoader() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const activeRequests = fetching + mutating
  const visible = useDelayedVisibility(activeRequests > 0)

  if (!visible) return null

  const finishing = activeRequests === 0
  const title = finishing
    ? 'Finishing up'
    : mutating > 0 && fetching === 0
      ? 'Saving changes'
      : mutating > 0
        ? 'Syncing workspace'
        : 'Loading data'
  const detail = finishing
    ? 'Almost ready'
    : `${activeRequests} ${activeRequests === 1 ? 'request' : 'requests'} in progress`

  return (
    <>
      <div className="global-api-progress" aria-hidden="true">
        <span className="global-api-progress__bar" />
      </div>

      <div
        className="global-api-loader"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${title}. ${detail}.`}
      >
        <span className="global-api-loader__orb" aria-hidden="true">
          <span className="global-api-loader__orbit" />
          <span className="global-api-loader__core" />
        </span>

        <span className="global-api-loader__copy">
          <span className="global-api-loader__title">{title}</span>
          <span className="global-api-loader__detail">{detail}</span>
        </span>

        <span className="global-api-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </>
  )
}

function useDelayedVisibility(active: boolean): boolean {
  const [visible, setVisible] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (active) {
      if (visible) return
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now()
        setVisible(true)
      }, SHOW_DELAY_MS)
      return () => window.clearTimeout(timer)
    }

    if (!visible) return
    const elapsed = Date.now() - shownAt.current
    const timer = window.setTimeout(() => setVisible(false), Math.max(0, MIN_VISIBLE_MS - elapsed))
    return () => window.clearTimeout(timer)
  }, [active, visible])

  return visible
}
