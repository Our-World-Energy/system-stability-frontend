// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveSseUrl } from './ws-status'

afterEach(() => vi.unstubAllEnvs())

describe('resolveSseUrl', () => {
  it('uses an explicit absolute VITE_SSE_URL verbatim', () => {
    vi.stubEnv('VITE_SSE_URL', 'http://149.28.112.32:18964/sse/status')
    expect(resolveSseUrl()).toBe('http://149.28.112.32:18964/sse/status')
  })

  it('derives from the REST API origin (same host+port, /sse/status) — never :3001', () => {
    vi.stubEnv('VITE_SSE_URL', '')
    vi.stubEnv('VITE_API_BASE_URL', 'http://149.28.112.32:18964/api')
    const url = resolveSseUrl()
    expect(url).toBe('http://149.28.112.32:18964/sse/status')
    expect(url).not.toContain('3001')
  })

  it('resolves a relative VITE_SSE_URL against the page origin (same-origin proxy)', () => {
    vi.stubEnv('VITE_SSE_URL', '/sse/status')
    expect(resolveSseUrl()).toBe(`${window.location.origin}/sse/status`)
  })
})
