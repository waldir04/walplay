import { describe, expect, it } from 'vitest'

import { CatalogError } from '../domain/errors.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import { createFakeTrailerProvider, sampleTrailerVideo } from '../test/fixtures/fakeTrailerProvider.js'
import { TrailerService } from './trailer.service.js'
import { CatalogCache } from './catalog-cache.js'

const now = Date.parse('2026-11-24T12:00:00.000Z')

const createService = (
  provider = createFakeTrailerProvider(),
  cache = new CatalogCache({ freshTtlMs: 86_400_000, staleTtlMs: 604_800_000, maxEntries: 10, now: () => now })
) =>
  new TrailerService({
    provider,
    cache,
    freshnessWindowMs: 86_400_000,
    retentionMs: 604_800_000,
    now: () => now,
  })

describe('TrailerService', () => {
  it('returns a ranked available inventory with provider metadata', async () => {
    const service = createService()

    const result = await service.getTrailers({ mediaType: 'movie', providerId: 550 })

    expect(result.data.state).toBe('available')
    expect(result.data.videos).toHaveLength(1)
    expect(result.meta).toMatchObject({
      stale: false,
      source: 'provider',
      freshness: 'current',
    })
    expect(Date.parse(result.meta.lastUpdatedAt)).toBe(now)
  })

  it('maps an empty provider result to no-videos, not an error', async () => {
    const provider = createFakeTrailerProvider([])
    const result = await createService(provider).getTrailers({
      mediaType: 'movie',
      providerId: 550,
    })

    expect(result.data).toEqual({ state: 'no-videos', videos: [] })
  })

  it('serves a repeated request from the dedicated cache', async () => {
    const provider = createFakeTrailerProvider()
    const service = createService(provider)

    await service.getTrailers({ mediaType: 'movie', providerId: 550 })
    const second = await service.getTrailers({ mediaType: 'movie', providerId: 550 })

    expect(provider.fetchTrailers).toHaveBeenCalledTimes(1)
    expect(second.meta.source).toBe('cache')
  })

  it('deduplicates concurrent loads with a single-flight request', async () => {
    const provider = createFakeTrailerProvider()
    const service = createService(provider)

    await Promise.all([
      service.getTrailers({ mediaType: 'movie', providerId: 550 }),
      service.getTrailers({ mediaType: 'movie', providerId: 550 }),
      service.getTrailers({ mediaType: 'movie', providerId: 550 }),
    ])

    expect(provider.fetchTrailers).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by media type and provider id without an interface language', async () => {
    const provider = createFakeTrailerProvider()
    const service = createService(provider)

    await service.getTrailers({ mediaType: 'movie', providerId: 550 })
    await service.getTrailers({ mediaType: 'movie', providerId: 551 })
    await service.getTrailers({ mediaType: 'tv', providerId: 550 })

    expect(provider.fetchTrailers).toHaveBeenCalledTimes(3)
  })

  it('maps a missing title to CATALOG_NOT_FOUND', async () => {
    const provider = createFakeTrailerProvider()
    provider.fetchTrailers.mockResolvedValueOnce(null)

    await expect(
      createService(provider).getTrailers({ mediaType: 'movie', providerId: 999_999 })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it.each([
    [new ProviderTimeoutError(), 'CATALOG_TIMEOUT'],
    [new ProviderRateLimitError(), 'CATALOG_RATE_LIMITED'],
    [new ProviderValidationError(), 'CATALOG_INVALID_RESPONSE'],
    [new ProviderNetworkError(), 'CATALOG_UNAVAILABLE'],
    [new ProviderHttpError(503), 'CATALOG_UNAVAILABLE'],
  ])('maps provider failure %s to %s', async (error, code) => {
    const provider = createFakeTrailerProvider()
    provider.fetchTrailers.mockRejectedValueOnce(error)

    try {
      await createService(provider).getTrailers({ mediaType: 'movie', providerId: 550 })
      expect.fail('expected a mapped catalog error')
    } catch (caught) {
      expect(caught).toBeInstanceOf(CatalogError)
      expect((caught as CatalogError).code).toBe(code)
    }
  })

  it('rejects an invalid provider id without calling the provider', async () => {
    const provider = createFakeTrailerProvider()
    await expect(
      createService(provider).getTrailers({ mediaType: 'movie', providerId: 0 })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(provider.fetchTrailers).not.toHaveBeenCalled()
  })

  it('keeps the stored inventory object unchanged', async () => {
    const video = sampleTrailerVideo()
    const provider = createFakeTrailerProvider([video])
    const result = await createService(provider).getTrailers({
      mediaType: 'movie',
      providerId: 550,
    })

    expect(result.data.videos[0]).toBe(video)
  })
})
