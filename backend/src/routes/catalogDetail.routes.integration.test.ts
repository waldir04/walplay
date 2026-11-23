import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { encodeItemId } from '../lib/itemId.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { TEST_CONFIG, createFakeProvider, sampleItem } from '../test/fixtures/fakeProvider.js'
import { createTestDetailService } from '../test/fixtures/fakeDetailProvider.js'
import { createTestSearchService } from '../test/fixtures/fakeSearchProvider.js'
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
    searchService: createTestSearchService(),
    detailService: createTestDetailService(),
  })
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

describe('catalog detail routes', () => {
  it('resolves an opaque movie id and returns only card fields plus meta', async () => {
    const itemId = encodeItemId('movie', 550)
    provider.fetchItem.mockResolvedValueOnce(sampleItem('movie', 550))

    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/${itemId}?language=en`)
    const body = (await response.json()) as {
      data: Record<string, unknown>
      meta: Record<string, unknown>
    }

    expect(response.status).toBe(200)
    expect(Object.keys(body.data).sort()).toEqual(
      ['genres', 'id', 'mediaType', 'poster', 'rating', 'releaseYear', 'title'].sort()
    )
    expect(body.meta).toMatchObject({ language: 'en-US', stale: false, source: 'provider' })
    expect(JSON.stringify(body)).not.toContain('overview')
    expect(JSON.stringify(body)).not.toContain('number_of_seasons')
    expect(JSON.stringify(body)).not.toContain('550')
  })

  it('does not leak raw provider identifiers', async () => {
    const itemId = encodeItemId('tv', 1399)
    provider.fetchItem.mockResolvedValueOnce(sampleItem('tv', 1399))
    const response = await fetch(`${server.baseUrl}/api/catalog/tv/titles/${itemId}?language=es`)
    const text = await response.text()
    expect(text).not.toContain('1399')
    expect(text).not.toContain('vote_average')
  })

  it('rejects malformed item ids before decoding', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/short?language=en`)
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a missing language', async () => {
    const itemId = encodeItemId('movie', 1)
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/${itemId}`)
    expect(response.status).toBe(400)
  })

  it('returns not found for a type mismatch', async () => {
    const itemId = encodeItemId('tv', 1)
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/${itemId}?language=en`)
    expect(response.status).toBe(404)
  })

  it('returns not found for an unknown or adult item', async () => {
    for (const mediaType of ['movie', 'tv'] as const) {
      const itemId = encodeItemId(mediaType, 999)
      provider.fetchItem.mockResolvedValueOnce(null)
      const response = await fetch(
        `${server.baseUrl}/api/catalog/${mediaType}/titles/${itemId}?language=en`
      )
      expect(response.status).toBe(404)
    }
  })

  it('never includes provider credentials in a detail response', async () => {
    const itemId = encodeItemId('movie', 550)
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/${itemId}?language=en`)
    const text = await response.text()
    expect(text).not.toContain('test-token')
    expect(text).not.toContain('TMDB_ACCESS_TOKEN')
  })
})
