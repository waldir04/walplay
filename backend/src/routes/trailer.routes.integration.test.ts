import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { encodeItemId } from '../lib/itemId.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { createFakeTrailerProvider, createTestTrailerService } from '../test/fixtures/fakeTrailerProvider.js'
import type { FakeTrailerProvider } from '../test/fixtures/fakeTrailerProvider.js'
import { createTestDetailService } from '../test/fixtures/fakeDetailProvider.js'
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import { createTestSearchService } from '../test/fixtures/fakeSearchProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

const buildApp = (options: {
  readonly provider?: FakeTrailerProvider
  readonly trailersEnabled?: boolean
} = {}) => {
  const provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  return createApp({
    config: { ...TEST_CONFIG, trailersEnabled: options.trailersEnabled ?? true },
    service: new CatalogService({ provider, cache }),
    searchService: createTestSearchService(),
    detailService: createTestDetailService(),
    ...(options.trailersEnabled === false
      ? {}
      : { trailerService: createTestTrailerService(options.provider ?? createFakeTrailerProvider()) }),
  })
}

const path = (mediaType: 'movie' | 'tv' = 'movie', providerId = 550, query = '') =>
  `/api/catalog/${mediaType}/titles/${encodeItemId(mediaType, providerId)}/videos${query}`

describe('trailer routes', () => {
  it('returns an available inventory with no-store', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as {
      data: { state: string; videos: readonly unknown[] }
      meta: { source: string }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.data.state).toBe('available')
    expect(body.data.videos).toHaveLength(1)
    expect(body.meta.source).toBe('provider')
  })

  it('returns the no-videos state for an empty inventory', async () => {
    server = await startTestServer(buildApp({ provider: createFakeTrailerProvider([]) }))

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as { data: { state: string; videos: unknown[] } }

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ state: 'no-videos', videos: [] })
  })

  it('rejects malformed and mismatched identifiers', async () => {
    server = await startTestServer(buildApp())

    const malformed = await fetch(`${server.baseUrl}/api/catalog/movie/titles/nope/videos`)
    expect(malformed.status).toBe(400)
    await expect(malformed.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    })

    const mismatch = await fetch(
      `${server.baseUrl}/api/catalog/tv/titles/${encodeItemId('movie', 550)}/videos`
    )
    expect(mismatch.status).toBe(404)
    await expect(mismatch.json()).resolves.toMatchObject({
      error: { code: 'CATALOG_NOT_FOUND' },
    })
  })

  it.each([
    [new ProviderTimeoutError(), 504, 'CATALOG_TIMEOUT'],
    [new ProviderRateLimitError(), 429, 'CATALOG_RATE_LIMITED'],
    [new ProviderValidationError(), 502, 'CATALOG_INVALID_RESPONSE'],
    [new ProviderNetworkError(), 502, 'CATALOG_UNAVAILABLE'],
    [new ProviderHttpError(503), 502, 'CATALOG_UNAVAILABLE'],
  ])('maps %s into the stable error envelope', async (error, status, code) => {
    const provider = createFakeTrailerProvider()
    provider.fetchTrailers.mockRejectedValueOnce(error)
    server = await startTestServer(buildApp({ provider }))

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(status)
    expect(body.error.code).toBe(code)
  })

  it('never returns a cached error body or provider details', async () => {
    const provider = createFakeTrailerProvider()
    provider.fetchTrailers.mockRejectedValueOnce(new ProviderValidationError())
    server = await startTestServer(buildApp({ provider }))

    const response = await fetch(`${server.baseUrl}${path()}`)
    const text = await response.text()

    expect(text).not.toContain('ProviderValidationError')
    expect(text).not.toContain('api.example.test')
  })

  it('is absent and returns ROUTE_NOT_FOUND when the capability is disabled', async () => {
    server = await startTestServer(buildApp({ trailersEnabled: false }))

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('ROUTE_NOT_FOUND')
  })
})
