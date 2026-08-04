/*
  The single way to call an owe-stability-service route.

    const { data, message } = await stabilityCaller(endpoints.credentialManager.create, payload)

  Every route answers with the same envelope — `{ status, message, data }` — so
  unwrapping it belongs here rather than in each feature module. Anything that is
  not a success throws `ApiError`, which carries a message already fit to render:
  the backend's own wording when there is one, a written-out explanation when the
  failure was transport-level.
*/

import { isAxiosError } from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { stabilityApi } from './client'
import type { StabilityEndpoint } from './endpoints'

/** The response shape shared by every route on the service. */
export interface ApiEnvelope<T> {
  status: number
  message: string
  data: T
}

export type ApiErrorCode =
  /** The service answered, but with a failure status. */
  | 'http'
  /** A 2xx envelope whose inner `status` still reported failure. */
  | 'envelope'
  /** The request never reached the service (offline, DNS, CORS, proxy down). */
  | 'network'
  /** The service took longer than the client timeout. */
  | 'timeout'
  /** The response was not the envelope this client understands. */
  | 'malformed'

/** A failed API call, normalised so the UI never has to inspect an AxiosError. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP (or envelope) status, 0 when the request never got a response. */
  readonly status: number
  /** Whatever the server sent back, for logging and field-level error mapping. */
  readonly detail: unknown

  constructor(code: ApiErrorCode, message: string, status = 0, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

/**
 * POST `payload` to `endpoint` and return its unwrapped envelope.
 *
 * @throws ApiError on any transport, HTTP or envelope-level failure.
 */
export async function stabilityCaller<TData = unknown>(
  endpoint: StabilityEndpoint,
  payload?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<TData>> {
  try {
    const res = await stabilityApi.post(endpoint, payload, config)
    return unwrap<TData>(res.data)
  } catch (err) {
    throw toApiError(err)
  }
}

function unwrap<T>(body: unknown): ApiEnvelope<T> {
  // delete-credential answers with a null payload, and a 204 arrives as ''. Both
  // are successes with nothing to hand back, not malformed responses.
  if (body === null || body === undefined || body === '') {
    return { status: 200, message: '', data: null as T }
  }
  if (typeof body !== 'object') {
    throw new ApiError('malformed', 'The service returned an unreadable response.')
  }
  const envelope = body as Partial<ApiEnvelope<T>>
  // Routes are expected to always envelope their reply, but a proxy or a future
  // handler could return a bare object. Treat that as the data itself rather than
  // failing a call that actually succeeded.
  if (typeof envelope.status !== 'number') {
    return { status: 200, message: '', data: body as T }
  }
  if (envelope.status >= 400) {
    throw new ApiError(
      'envelope',
      envelope.message?.trim() || 'The request was rejected.',
      envelope.status,
      envelope.data,
    )
  }
  return {
    status: envelope.status,
    message: envelope.message ?? '',
    data: envelope.data as T,
  }
}

/** Normalise anything thrown by axios (or by `unwrap`) into an `ApiError`. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err

  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'The service took too long to respond. Please try again.')
    }
    if (!err.response) {
      return new ApiError('network', 'Cannot reach the credential service.')
    }
    const status = err.response.status
    const contentType = String(err.response.headers?.['content-type'] ?? '')
    return new ApiError(
      'http',
      serverMessage(err.response.data, contentType) ?? httpFallback(status),
      status,
      err.response.data,
    )
  }

  if (err instanceof Error && err.message) return new ApiError('malformed', err.message)
  return new ApiError('malformed', 'The request failed for an unknown reason.')
}

/**
 * Prefer the backend's own wording so validation copy reaches the user verbatim.
 * An AxiosError's `message` is deliberately not consulted — it is internal
 * phrasing like "Request failed with status code 400".
 *
 * A non-JSON body is never trusted as a message. The API contract puts errors in
 * `{ message, status }`, so anything else is infrastructure talking: Go's bare
 * "404 page not found" for an unrouted path, an HTML error page from a proxy.
 * Those get the written-out fallback instead.
 */
function serverMessage(data: unknown, contentType = ''): string | null {
  const isJson = contentType.includes('json')
  if (typeof data === 'string') {
    const text = data.trim()
    return isJson && text && !text.startsWith('<') ? text : null
  }
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown }
    for (const candidate of [body.message, body.error]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
  }
  return null
}

function httpFallback(status: number): string {
  if (status === 401 || status === 403) return 'You are not authorised to perform this action.'
  if (status === 404)
    return 'The credential service route was not found. It may not be deployed yet.'
  if (status === 409) return 'A credential with those details already exists.'
  if (status >= 500) return 'The credential service is currently unavailable.'
  return 'The request was rejected by the credential service.'
}
