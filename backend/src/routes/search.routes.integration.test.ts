import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createFakeSearchProvider, searchItem } from '../test/fixtures/fakeSearchProvider.js'
import type { FakeSearchProvider } from '../test/fixtures/fakeSearchProvider.js'
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { SearchService } from '../services/search.service.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer
let provider: FakeSearchProvider

const buildServer = async (fake: FakeSearchProvider): Promise<TestServer> => {
  const app = createApp({
    config: TEST_CONFIG,
    service: new CatalogService({
      provider: createFakeProvider(),
      cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 }),
    }),
    searchService: new SearchService({
      provider: fake,
      cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 }),
    }),
  })
  return startTestServer(app)
}

beforeEach(async () => {
  provider = createFakeSearchProvider({
    pages: {
      1: { page: 1, items: [searchItem('movie', 550), searchItem('tv', 1399)], totalPages: 2 },
      2: { page: 2, items: [], totalPages: 3 },
    },
  })
  server = await buildServer(provider)
})

afterEach(async () => {
  await server.close()
})

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${server.baseUrl}${path}`, { headers })

describe('search route integration', () => {
  it('returns the search envelope with data and meta and no provider totals', async () => {
    const response = await get('/api/search?query=fight+club&language=en&page=1')
    const body = (await response.json()) as {
      data: { page: number; items: { id: string; mediaType: string }[]; totalPages?: number; hasMore: boolean }
      meta: { language: string; stale: boolean; source: string; lastUpdatedAt: string }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(body.data).toMatchObject({ page: 1, hasMore: true, totalPages: 2 })
    expect(body.data.items.map((item) => item.mediaType)).toEqual(['movie', 'tv'])
    expect(body.data.items[0]?.id).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(body.meta).toMatchObject({ language: 'en-US', stale: false, source: 'provider' })
    expect(JSON.stringify(body)).not.toContain('totalResults')
    expect(JSON.stringify(body)).not.toContain('total_results')
    expect(JSON.stringify(body)).not.toContain('media_type')
    expect(JSON.stringify(body)).not.toContain('popularity')
  })

  it('trims the query, preserves internal whitespace for the provider, and defaults page to one', async () => {
    const response = await get('/api/search?query=++The+++Matrix++&language=es')

    expect(response.status).toBe(200)
    expect(provider.calls[0]).toEqual({
      query: 'The   Matrix',
      language: 'es-ES',
      page: 1,
    })
  })

  it('reports an empty page with more pages without inventing no-results', async () => {
    const response = await get('/api/search?query=the+matrix&language=en&page=2')
    const body = (await response.json()) as { data: { items: unknown[]; hasMore: boolean } }

    expect(response.status).toBe(200)
    expect(body.data.items).toEqual([])
    expect(body.data.hasMore).toBe(true)
  })

  it('rejects empty, whitespace-only, too-short, and invisible input without a provider call', async () => {
    for (const query of ['', '%20%20', 'a', '+a+']) {
      const response = await get(`/api/search?query=${query}&language=en`)
      expect(response.status, query).toBe(400)
      const body = (await response.json()) as { error: { code: string } }
      expect(body.error.code).toBe('VALIDATION_ERROR')
    }
    expect(provider.calls).toHaveLength(0)
  })

  it('counts code points so a 200-code-point astral query is accepted and 201 is rejected', async () => {
    const accepted = await get(
      `/api/search?query=${encodeURIComponent('😀'.repeat(200))}&language=en`
    )
    expect(accepted.status).toBe(200)

    const rejected = await get(
      `/api/search?query=${encodeURIComponent('😀'.repeat(201))}&language=en`
    )
    expect(rejected.status).toBe(400)
  })

  it('rejects missing/unsupported languages, invalid pages, the page ceiling, unknown keys, and duplicated keys', async () => {
    const cases = [
      '/api/search?query=matrix',
      '/api/search?query=matrix&language=fr',
      '/api/search?query=matrix&language=en&page=0',
      '/api/search?query=matrix&language=en&page=abc',
      '/api/search?query=matrix&language=en&page=1001',
      '/api/search?query=matrix&language=en&region=US',
      '/api/search?query=matrix&language=en&mediaType=movie',
      '/api/search?query=a&query=b&language=en',
    ]

    for (const path of cases) {
      const response = await get(path)
      expect(response.status, path).toBe(400)
      const body = (await response.json()) as { error: { code: string } }
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('sets no-store on errors and keeps the CORS allowlist', async () => {
    const errorResponse = await get('/api/search?query=a&language=en', {
      Origin: 'http://localhost:5173',
    })
    expect(errorResponse.headers.get('cache-control')).toBe('no-store')
    expect(errorResponse.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')

    const preflight = await fetch(`${server.baseUrl}/api/search?query=matrix&language=en`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')

    const disallowed = await fetch(`${server.baseUrl}/api/search`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://evil.example' },
    })
    expect(disallowed.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('never echoes the query or leaks provider payloads, field names, or credentials', async () => {
    const response = await get('/api/search?query=confidentialtitle&language=en')
    const text = await response.text()

    expect(text).not.toContain('confidentialtitle')
    expect(text).not.toContain('test-token')
    expect(text).not.toContain('TMDB_')
    expect(text).not.toContain('api.example.test')
    expect(text).not.toContain('poster_path')
    expect(text).not.toContain('vote_average')
    expect(text).not.toContain('overview')
  })

  it('maps provider failures to the stable envelope without technical detail', async () => {
    const failing = createFakeSearchProvider({ error: new Error('provider stack detail') })
    await server.close()
    server = await buildServer(failing)

    const response = await get('/api/search?query=matrix&language=en')
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'INTERNAL_ERROR' } })
    expect(text).not.toContain('provider stack detail')
  })

  it('never logs the query text', async () => {
    const info = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await get('/api/search?query=confidentialtitle&language=en')
      const written = info.mock.calls.map((call) => String(call[0])).join(' ')
      expect(written).not.toContain('confidentialtitle')
    } finally {
      info.mockRestore()
    }
  })
})
