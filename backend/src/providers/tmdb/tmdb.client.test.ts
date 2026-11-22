import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createTmdbClient } from './tmdb.client.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from './tmdb.errors.js'

const schema = z.object({ ok: z.boolean() })

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const buildClient = (fetchImpl: typeof fetch, maxRetries = 2) =>
  createTmdbClient({
    baseUrl: 'https://api.example.test/3',
    accessToken: 'secret-token',
    timeoutMs: 1000,
    maxRetries,
    fetchImpl,
    sleep: async () => undefined,
    random: () => 0.5,
    signalFactory: () => new AbortController().signal,
  })

describe('tmdb client', () => {
  it('sends a bearer token and parses a valid response', async () => {
    const fetchImpl = vi.fn(async (_input: unknown, _init?: unknown) => jsonResponse({ ok: true }))
    const client = buildClient(fetchImpl as unknown as typeof fetch)

    await expect(
      client.request('/movie/popular', { page: 2, language: 'en-US' }, schema)
    ).resolves.toEqual({
      ok: true,
    })

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.example.test/3/movie/popular?page=2&language=en-US')
    expect((init as { headers?: unknown } | undefined)?.headers).toMatchObject({
      Authorization: 'Bearer secret-token',
    })
  })

  it('retries transient network failures within the configured bound', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket'))
      .mockRejectedValueOnce(new Error('socket'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const client = buildClient(fetchImpl as unknown as typeof fetch)
    await expect(client.request('/x', {}, schema)).resolves.toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('stops after the retry bound and reports a network failure', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('socket')
    })
    const client = buildClient(fetchImpl as unknown as typeof fetch, 1)

    await expect(client.request('/x', {}, schema)).rejects.toBeInstanceOf(ProviderNetworkError)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry timeouts', async () => {
    const timeout = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
    const fetchImpl = vi.fn(async () => {
      throw timeout
    })
    const client = buildClient(fetchImpl as unknown as typeof fetch)

    await expect(client.request('/x', {}, schema)).rejects.toBeInstanceOf(ProviderTimeoutError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('respects a short Retry-After and retries a 429 once allowed', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const client = buildClient(fetchImpl as unknown as typeof fetch)
    await expect(client.request('/x', {}, schema)).resolves.toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry a long Retry-After storm', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 429, { 'Retry-After': '120' }))
    const client = buildClient(fetchImpl as unknown as typeof fetch)

    await expect(client.request('/x', {}, schema)).rejects.toBeInstanceOf(ProviderRateLimitError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries 5xx responses up to the bound then fails safely', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 503))
    const client = buildClient(fetchImpl as unknown as typeof fetch, 1)

    await expect(client.request('/x', {}, schema)).rejects.toBeInstanceOf(ProviderHttpError)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry 401/403/404 responses', async () => {
    for (const status of [401, 403, 404]) {
      const fetchImpl = vi.fn(async () => jsonResponse({}, status))
      const client = buildClient(fetchImpl as unknown as typeof fetch)
      await expect(client.request('/x', {}, schema)).rejects.toMatchObject({ status })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    }
  })

  it('rejects malformed JSON and invalid schema responses', async () => {
    const malformed = vi.fn(async () => new Response('not-json', { status: 200 }))
    await expect(
      buildClient(malformed as unknown as typeof fetch).request('/x', {}, schema)
    ).rejects.toBeInstanceOf(ProviderValidationError)

    const invalid = vi.fn(async () => jsonResponse({ ok: 'yes' }))
    await expect(
      buildClient(invalid as unknown as typeof fetch).request('/x', {}, schema)
    ).rejects.toBeInstanceOf(ProviderValidationError)
  })

  it('never exposes the credential in errors', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500))
    const client = buildClient(fetchImpl as unknown as typeof fetch, 0)

    try {
      await client.request('/x', {}, schema)
      expect.fail('expected failure')
    } catch (error) {
      expect(String(error)).not.toContain('secret-token')
    }
  })
})
