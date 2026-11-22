import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { CatalogApiError, createHttpClient } from './httpClient'

const bodySchema = z.object({ data: z.object({ value: z.string() }) })

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const build = (fetchImpl: typeof fetch) =>
  createHttpClient({ baseUrl: 'http://localhost:4000', fetchImpl, timeoutMs: 1000 })

describe('httpClient', () => {
  it('parses a success envelope and returns the request id', async () => {
    const fetchImpl = vi.fn(async () =>
      json({ data: { value: 'ok' } }, 200, { 'X-Request-Id': 'req-1' })
    )
    const client = build(fetchImpl as unknown as typeof fetch)

    await expect(client.get('/api/x', bodySchema)).resolves.toEqual({
      body: { data: { value: 'ok' } },
      requestId: 'req-1',
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:4000/api/x',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('maps a non-2xx error envelope to a typed code', async () => {
    const fetchImpl = vi.fn(async () => json({ error: { code: 'CATALOG_RATE_LIMITED' } }, 429))
    const client = build(fetchImpl as unknown as typeof fetch)

    await expect(client.get('/api/x', bodySchema)).rejects.toMatchObject({
      name: 'CatalogApiError',
      code: 'CATALOG_RATE_LIMITED',
      status: 429,
    })
  })

  it('maps unknown error codes safely', async () => {
    const fetchImpl = vi.fn(async () => json({ error: { code: 'PROVIDER_RAW' } }, 500))
    const client = build(fetchImpl as unknown as typeof fetch)

    await expect(client.get('/api/x', bodySchema)).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
  })

  it('maps timeout aborts', async () => {
    const timeout = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
    const fetchImpl = vi.fn(async () => {
      throw timeout
    })
    const client = build(fetchImpl as unknown as typeof fetch)

    await expect(client.get('/api/x', bodySchema)).rejects.toBeInstanceOf(CatalogApiError)
    await expect(client.get('/api/x', bodySchema)).rejects.toMatchObject({
      code: 'CATALOG_TIMEOUT',
    })
  })

  it('maps network failures to unavailable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline')
    })
    const client = build(fetchImpl as unknown as typeof fetch)

    await expect(client.get('/api/x', bodySchema)).rejects.toMatchObject({
      code: 'CATALOG_UNAVAILABLE',
    })
  })

  it('rejects malformed JSON and invalid envelopes', async () => {
    const malformed = vi.fn(async () => new Response('not-json', { status: 200 }))
    await expect(
      build(malformed as unknown as typeof fetch).get('/api/x', bodySchema)
    ).rejects.toMatchObject({ code: 'CATALOG_INVALID_RESPONSE' })

    const invalid = vi.fn(async () => json({ data: { value: 1 } }))
    await expect(
      build(invalid as unknown as typeof fetch).get('/api/x', bodySchema)
    ).rejects.toMatchObject({ code: 'CATALOG_INVALID_RESPONSE' })
  })

  it('never exposes raw provider text in errors', async () => {
    const fetchImpl = vi.fn(async () =>
      json({ error: { code: 'CATALOG_UNAVAILABLE', message: 'TMDB raw failure text' } }, 502)
    )
    const client = build(fetchImpl as unknown as typeof fetch)

    try {
      await client.get('/api/x', bodySchema)
      expect.fail('expected failure')
    } catch (error) {
      expect(String(error)).not.toContain('TMDB raw')
      expect(String(error)).not.toContain('502 response')
    }
  })
})
