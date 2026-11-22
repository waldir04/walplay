import { describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@/shared/api/httpClient'
import { firstSearchPage } from '@/test/fixtures/catalog/search'

import { createCatalogClient } from './catalogClient'

describe('catalogClient search', () => {
  it('calls the internal search endpoint with encoded query, language, and page', async () => {
    const http: HttpClient = {
      get: vi.fn(async () => ({
        body: firstSearchPage(),
        requestId: 'req-1',
      })) as HttpClient['get'],
    }
    const client = createCatalogClient(http)

    const body = await client.getSearchPage({
      query: 'the matrix & more',
      language: 'es',
      page: 2,
    })

    expect(body.data.page).toBe(1)
    expect(http.get).toHaveBeenCalledWith(
      '/api/search?query=the%20matrix%20%26%20more&language=es&page=2',
      expect.anything()
    )
    const path = String(vi.mocked(http.get).mock.calls[0]?.[0])
    expect(path.startsWith('/api/search?')).toBe(true)
    expect(path).not.toContain(' ')
    expect(path).not.toContain('TMDB')
    expect(path).not.toContain('api.themoviedb.org')
  })

  it('validates the response with the shared search page schema', async () => {
    let captured: unknown
    const http: HttpClient = {
      get: vi.fn(async (_path: string, schema) => {
        const parsed = schema.safeParse({ data: { page: 0, items: [] }, meta: {} })
        captured = parsed
        if (!parsed.success) {
          throw new Error('search response rejected')
        }
        return { body: parsed.data, requestId: '' }
      }) as HttpClient['get'],
    }
    const client = createCatalogClient(http)

    await expect(
      client.getSearchPage({ query: 'matrix', language: 'en', page: 1 })
    ).rejects.toThrow('search response rejected')
    expect(captured).toMatchObject({ success: false })
  })
})
