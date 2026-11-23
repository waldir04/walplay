import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { encodeItemId } from '../lib/itemId.js'
import { ProviderTimeoutError } from '../providers/tmdb/tmdb.errors.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { DetailService } from '../services/detail.service.js'
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import {
  createFakeDetailProvider,
  sampleCredits,
  sampleSeasonEpisodes,
  sampleTitleDetail,
} from '../test/fixtures/fakeDetailProvider.js'
import type { FakeDetailProvider } from '../test/fixtures/fakeDetailProvider.js'
import { createTestSearchService } from '../test/fixtures/fakeSearchProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer
let detailProvider: FakeDetailProvider

const movieId = encodeItemId('movie', 550)
const tvId = encodeItemId('tv', 213)

beforeEach(async () => {
  detailProvider = createFakeDetailProvider()
  const cacheOptions = { freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 }
  const app = createApp({
    config: TEST_CONFIG,
    service: new CatalogService({
      provider: createFakeProvider(),
      cache: new CatalogCache(cacheOptions),
    }),
    detailService: new DetailService({
      provider: detailProvider,
      cache: new CatalogCache(cacheOptions),
    }),
    searchService: createTestSearchService(),
  })
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

describe('detail routes', () => {
  it('serves every detail endpoint with no-store and a request id', async () => {
    detailProvider.fetchCredits.mockResolvedValueOnce(sampleCredits())
    detailProvider.fetchSeason.mockResolvedValueOnce(sampleSeasonEpisodes(1))

    const paths = [
      `/api/catalog/movie/titles/${movieId}/detail?language=en`,
      `/api/catalog/movie/titles/${movieId}/credits?language=en`,
      `/api/catalog/movie/titles/${movieId}/similar?language=en`,
      `/api/catalog/movie/titles/${movieId}/collection?language=en`,
      `/api/catalog/tv/titles/${tvId}/seasons/1?language=en`,
    ]

    for (const path of paths) {
      const response = await fetch(`${server.baseUrl}${path}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/)
      expect(response.headers.get('content-type')).toContain('application/json')
    }
  })

  it('never leaks provider identifiers, field names, or credentials', async () => {
    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`
    )
    const text = await response.text()
    for (const leak of ['550', 'poster_path', 'vote_average', 'test-token', 'TMDB_ACCESS_TOKEN']) {
      expect(text).not.toContain(leak)
    }
  })

  it('rejects malformed ids and media type mismatches', async () => {
    const malformed = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/short/detail?language=en`
    )
    expect(malformed.status).toBe(400)

    const mismatch = await fetch(
      `${server.baseUrl}/api/catalog/tv/titles/${movieId}/detail?language=en`
    )
    expect(mismatch.status).toBe(404)
    await expect(mismatch.json()).resolves.toMatchObject({
      error: { code: 'CATALOG_NOT_FOUND' },
    })
  })

  it('returns not found for an adult, removed, or unusable title', async () => {
    detailProvider.fetchDetail.mockResolvedValueOnce(null)
    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`
    )
    expect(response.status).toBe(404)
  })

  it('treats a secondary provider 404 as empty data with 200', async () => {
    detailProvider.fetchCredits.mockResolvedValueOnce({ cast: [], crew: [] })
    detailProvider.fetchSimilar.mockResolvedValueOnce([])
    detailProvider.fetchCollection.mockResolvedValueOnce({ items: [] })

    for (const surface of ['credits', 'similar', 'collection']) {
      const response = await fetch(
        `${server.baseUrl}/api/catalog/movie/titles/${movieId}/${surface}?language=en`
      )
      expect(response.status).toBe(200)
    }
    const similar = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/similar?language=en`
    )
    await expect(similar.json()).resolves.toMatchObject({ data: { items: [] } })
  })

  it('maps a missing season to DETAIL_SEASON_NOT_FOUND without a page-level not-found', async () => {
    detailProvider.fetchSeason.mockResolvedValueOnce(null)
    const response = await fetch(
      `${server.baseUrl}/api/catalog/tv/titles/${tvId}/seasons/9?language=en`
    )
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'DETAIL_SEASON_NOT_FOUND' },
    })
  })

  it('returns stable error codes for provider failures', async () => {
    detailProvider.fetchDetail.mockRejectedValueOnce(new ProviderTimeoutError())
    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`
    )
    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'CATALOG_TIMEOUT' } })
  })

  it('applies the configured CORS allowlist', async () => {
    const allowed = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`,
      { headers: { Origin: 'http://localhost:5173' } }
    )
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')

    const blocked = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`,
      { headers: { Origin: 'https://evil.example' } }
    )
    expect(blocked.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns provider-neutral data shapes', async () => {
    detailProvider.fetchDetail.mockResolvedValueOnce({
      detail: sampleTitleDetail('movie', 550),
    })
    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en`
    )
    const body = (await response.json()) as { data: Record<string, unknown> }
    expect(Object.keys(body.data)).toEqual(
      expect.arrayContaining(['id', 'mediaType', 'title', 'genres'])
    )
    expect(body.data).not.toHaveProperty('collectionProviderId')
  })
})
