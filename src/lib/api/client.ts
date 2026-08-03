/*
  Axios instance for the owe-stability-service backend (credential manager and
  friends). Separate from `lib/axios.ts`, which points at the health/status
  service on a different origin.

  Base URL resolution mirrors how the SSE URL is handled elsewhere:
  VITE_STABILITY_SERVICE_URL is used verbatim when set, otherwise requests go to
  the same-origin `/stability` prefix, which the Vite dev proxy and the Vercel
  rewrite both forward to `<host>/api/owe-stability-service`.

  Development points straight at the backend, so the URL in devtools is the real
  one. That needs the service to answer CORS preflights; production keeps the
  rewrite because an https page cannot call an http:// origin at all.
*/

import axios from 'axios'
import { TOKEN_KEY, clearStoredSession } from '@/lib/auth-storage'

/** Same-origin prefix the dev proxy and the Vercel rewrite both understand. */
export const STABILITY_PROXY_PREFIX = '/stability'

/** Where credential-manager calls are sent. */
export const stabilityBaseUrl: string =
  import.meta.env.VITE_STABILITY_SERVICE_URL?.trim() || STABILITY_PROXY_PREFIX

export const stabilityApi = axios.create({
  baseURL: stabilityBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

stabilityApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

stabilityApi.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired session should bounce to the login page, same as the status API.
    // The caller still gets the rejection so the form can stop its pending state.
    if (err.response?.status === 401) {
      clearStoredSession()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
