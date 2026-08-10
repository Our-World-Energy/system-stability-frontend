/*
  Axios instances for the owe-stability-service backend. The health/status feed is
  not here — it is public, and `useStatusStream`/`useStatusPoller` reach it with
  EventSource and `fetch` directly.

  One origin serves both halves of the service, so both instances resolve from the
  same base:

    stabilityApi      → <base>/credential-manager/*
    userManagementApi → <base>/user-management/*

  They stay separate instances rather than one shared client because the two halves
  have different endpoint vocabularies (see `endpoints.ts`), and because they were on
  separate hosts until recently — keeping the seam means a future split is a one-line
  change here rather than a refactor.

  VITE_STABILITY_SERVICE_URL is used verbatim when set, otherwise requests go to the
  same-origin `/stability` prefix that the Vite dev proxy and the Vercel rewrite both
  forward to the real host. Going through the proxy means the browser only ever talks
  to its own origin, so the Go service never has to answer a CORS preflight — which
  matters, because it does not.

  Both instances share the same request/response behaviour: attach the bearer token
  when one is stored, and end the session on any 401.
*/

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { SESSION_ENDED_NOTICE, TOKEN_KEY, endSession } from '@/lib/auth-storage'

/** Same-origin prefix the dev proxy and the Vercel rewrite both understand. */
export const STABILITY_PROXY_PREFIX = '/stability'

/** Where credential-manager calls are sent. */
export const stabilityBaseUrl: string =
  import.meta.env.VITE_STABILITY_SERVICE_URL?.trim() || STABILITY_PROXY_PREFIX

/**
 * Where user-management calls are sent. Always ends in `/user-management`, since
 * the endpoint paths in `endpoints.ts` are bare segments (`login`, `get-users`).
 *
 * Derived from the stability base, because one origin serves both halves. The
 * override exists only for the case where user management moves back onto a host of
 * its own — set it to a full URL including the `/user-management` segment.
 */
export const userManagementBaseUrl: string =
  import.meta.env.VITE_USER_MANAGEMENT_URL?.trim() ||
  `${stabilityBaseUrl.replace(/\/+$/, '')}/user-management`

/**
 * Attach the stored bearer token, and bounce to /login when the service says the
 * session is gone. The caller still gets the rejection so a form can stop its
 * pending state and render the backend's message.
 *
 * localStorage is read per request rather than captured once, so a token stored
 * after this module loaded (i.e. the login that just happened) is still picked up.
 */
function withSession(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      // Every 401 on either instance ends the session — including the ones the
      // service now raises mid-session, when an admin has changed this user's role
      // or disabled the account and the still-unexpired JWT no longer matches the
      // live row. `endSession` skips the bounce on /login, where a 401 is a rejected
      // sign-in for the form to render rather than a session to end.
      //
      // Handled here rather than in the store so it also covers callers that never
      // touch the store, and to avoid importing it (which imports axios back).
      if (err.response?.status === 401) {
        endSession(SESSION_ENDED_NOTICE)
      }
      return Promise.reject(err)
    },
  )

  return instance
}

export const stabilityApi = withSession(
  axios.create({
    baseURL: stabilityBaseUrl,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  }),
)

export const userManagementApi = withSession(
  axios.create({
    baseURL: userManagementBaseUrl,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  }),
)
