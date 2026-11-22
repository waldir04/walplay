import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import type { HttpClient } from '@/shared/api/httpClient'

import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { createCatalogClient } from './catalogClient'

const httpReturning = (body: unknown): HttpClient => ({
  get: vi.fn(async () => ({ body, requestId: 'req-1' })) as HttpClient['get'],
})

describe('catalogClient', () => {
  it('fetches capabilities from the internal API', async () => {
    const http = httpReturning({ data: { sections: CAPABILITIES } })
    const client = createCatalogClient(http)

    const body = await client.getCapabilities()
    expect(body.data.sections).toHaveLength(3)
    expect(http.get).toHaveBeenCalledWith('/api/catalog/capabilities', expect.anything())
  })

  it('sends media type, section, language, and page for a section read', async () => {
    const http = httpReturning(pageEnvelope({ items: [movieItem()] }))
    const client = createCatalogClient(http)

    await client.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'es',
      page: 2,
    })

    expect(http.get).toHaveBeenCalledWith(
      '/api/catalog/movie/popular?language=es&page=2',
      expect.anything()
    )
  })

  it('encodes the opaque item id and sends the language', async () => {
    const http = httpReturning({ data: movieItem(), meta: pageEnvelope({ items: [] }).meta })
    const client = createCatalogClient(http)

    await client.getItem({ mediaType: 'movie', itemId: MOVIE_ID, language: 'en' })

    expect(http.get).toHaveBeenCalledWith(
      `/api/catalog/movie/titles/${MOVIE_ID}?language=en`,
      expect.anything()
    )
  })

  it('never sends provider credentials or provider endpoints', async () => {
    const http = httpReturning(pageEnvelope({ items: [] }))
    const client = createCatalogClient(http)
    await client.getSectionPage({ mediaType: 'movie', section: 'popular', language: 'en', page: 1 })

    const path = String(vi.mocked(http.get).mock.calls[0]?.[0])
    expect(path).not.toContain('TMDB')
    expect(path).not.toContain('api.themoviedb.org')
    expect(path.startsWith('/api/catalog/')).toBe(true)
  })

  it('uses the provided transport schema', async () => {
    const http: HttpClient = {
      get: vi.fn(async (_path: string, schema: z.ZodType) => {
        const parsed = schema.safeParse({ data: { sections: CAPABILITIES } })
        return { body: parsed.success ? parsed.data : null, requestId: '' }
      }) as HttpClient['get'],
    }
    const client = createCatalogClient(http)
    await expect(client.getCapabilities()).resolves.toMatchObject({
      data: { sections: CAPABILITIES },
    })
  })
})
