import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { ApiError, toApiError } from './caller'

/** Build an AxiosError the way axios reports a real HTTP failure. */
function httpError(status: number, data: unknown, contentType = 'application/json') {
  const headers = new AxiosHeaders({ 'content-type': contentType })
  const err = new AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST')
  err.response = { status, data, headers, statusText: '', config: { headers } } as never
  return err
}

describe('toApiError', () => {
  it('shows the service’s own message when it sends one', () => {
    const error = toApiError(httpError(400, { message: 'q is required', status: 400 }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('q is required')
    expect(error.status).toBe(400)
  })

  it('ignores a non-JSON body and explains the status instead', () => {
    // Go answers an unrouted path with a bare "404 page not found"; pasting that
    // into a toast tells an admin nothing about what to do.
    const error = toApiError(httpError(404, '404 page not found', 'text/plain; charset=utf-8'))
    expect(error.message).toBe(
      'The credential service route was not found. It may not be deployed yet.',
    )
  })

  it('ignores an HTML error page from a proxy', () => {
    const error = toApiError(httpError(502, '<html>Bad Gateway</html>', 'text/html'))
    expect(error.message).toBe('The credential service is currently unavailable.')
  })

  it('never leaks axios’ internal phrasing', () => {
    const error = toApiError(httpError(409, {}, 'application/json'))
    expect(error.message).not.toMatch(/status code/i)
    expect(error.message).toBe('A credential with those details already exists.')
  })

  it('distinguishes a timeout from an unreachable service', () => {
    const timeout = new AxiosError('timeout', 'ECONNABORTED')
    expect(toApiError(timeout).code).toBe('timeout')

    const offline = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(toApiError(offline).code).toBe('network')
    expect(toApiError(offline).message).toBe('Cannot reach the credential service.')
  })

  it('passes an ApiError through untouched', () => {
    const original = new ApiError('envelope', 'That name is already taken.', 409)
    expect(toApiError(original)).toBe(original)
  })
})
