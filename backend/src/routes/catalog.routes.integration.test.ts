import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { encodeItemId } from '../lib/itemId.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { TEST_CONFIG, createFakeProvider, sampleItem } from '../test/fixtures/fakeProvider.js'
import type { FakeProvider } from '../test/fixtures/fakeProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer
let provider: FakeProvider

beforeEach(async () => {
  provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  const app = createApp({
    config: TEST_CONFIG,
    service: new CatalogService({ provider, cache }),
  })
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${server.baseUrl}${path}`, { headers })

describe('catalog routes', () => {
  it('returns capabilities in declared order', async () => {
    const response = await get('/api/catalog/capabilities')
    const body = (await response.json()) as {
      data: { sections: { id: string; order: number; paginated: boolean }[] }
    }

    expect(response.status).toBe(200)
    expect(body.data.sections.map((section) => section.id)).toEqual([
      'trending',
      'popular',
      'top-rated',
    ])
  })

  it('returns a section page with data and meta envelopes', async () => {
    const response = await get('/api/catalog/movie/popular?language=en&page=2')
    const body = (await response.json()) as {
      data: {
        mediaType: string
        section: string
        page: number
        hasMore: boolean
        items: { id: string }[]
      }
      meta: { language: string; stale: boolean; source: string; lastUpdatedAt: string }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(body.data).toMatchObject({
      mediaType: 'movie',
      section: 'popular',
      page: 2,
      hasMore: true,
    })
    expect(body.meta).toMatchObject({ language: 'en-US', stale: false, source: 'provider' })
    expect(body.data.items[0]?.id).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(JSON.stringify(body)).not.toMatch(/\b(550|poster_path|vote_average)\b/)
  })

  it('defaults page to one and accepts Spanish language', async () => {
    const response = await get('/api/catalog/tv/top-rated?language=es')
    const body = (await response.json()) as { data: { page: number }; meta: { language: string } }

    expect(response.status).toBe(200)
    expect(body.data.page).toBe(1)
    expect(body.meta.language).toBe('es-ES')
  })

  it('rejects unknown query keys, unsupported languages, invalid pages, and trending pages', async () => {
    const cases = [
      '/api/catalog/movie/popular?language=en&region=US',
      '/api/catalog/movie/popular?language=fr',
      '/api/catalog/movie/popular?language=en&page=0',
      '/api/catalog/movie/popular?language=en&page=abc',
      '/api/catalog/movie/trending?language=en&page=2',
      '/api/catalog/movie/unknown?language=en',
    ]

    for (const path of cases) {
      const response = await get(path)
      const body = (await response.json()) as { error: { code: string } }
      expect(response.status, path).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('answers an allowed CORS preflight and omits headers for other origins', async () => {
    const allowed = await fetch(`${server.baseUrl}/api/catalog/capabilities`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(allowed.headers.get('access-control-allow-methods')).toBe('GET,OPTIONS')

    const disallowed = await fetch(`${server.baseUrl}/api/catalog/capabilities`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://evil.example' },
    })
    expect(disallowed.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('never includes provider payloads, field names, or secrets in responses', async () => {
    const response = await get('/api/catalog/movie/popular?language=en')
    const text = await response.text()
    expect(text).not.toContain('secret-token')
    expect(text).not.toContain('TMDB_')
    expect(text).not.toContain('poster_path')
    expect(text).not.toContain('vote_average')
    expect(text).not.toContain('api.example.test')
  })

  it('serves detail items only for matching opaque ids', async () => {
    const itemId = encodeItemId('movie', 550)
    provider.fetchItem.mockResolvedValueOnce(sampleItem('movie', 550))

    const response = await get(`/api/catalog/movie/titles/${itemId}?language=en`)
    const body = (await response.json()) as { data: { id: string; title: string } }

    expect(response.status).toBe(200)
    expect(body.data.title).toBe('Fight Club')
    expect(body.data.id).toBe(itemId)
    expect(JSON.stringify(body)).not.toContain('550')
  })

  it('rejects invalid detail ids, missing language, and type mismatches', async () => {
    const movieId = encodeItemId('movie', 550)

    const invalid = await get('/api/catalog/movie/titles/not-valid!?language=en')
    expect(invalid.status).toBe(400)

    const missingLanguage = await get(`/api/catalog/movie/titles/${movieId}`)
    expect(missingLanguage.status).toBe(400)

    const mismatch = await get(`/api/catalog/tv/titles/${movieId}?language=en`)
    const mismatchBody = (await mismatch.json()) as { error: { code: string } }
    expect(mismatch.status).toBe(404)
    expect(mismatchBody.error.code).toBe('CATALOG_NOT_FOUND')
  })

  it('returns not found when the provider has no such item', async () => {
    const itemId = encodeItemId('movie', 999)
    provider.fetchItem.mockResolvedValueOnce(null)

    const response = await get(`/api/catalog/movie/titles/${itemId}?language=en`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('CATALOG_NOT_FOUND')
  })
})
