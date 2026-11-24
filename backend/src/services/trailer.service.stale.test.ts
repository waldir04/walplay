import { describe, expect, it } from 'vitest'

import type { ProviderTrailerInventory } from '../providers/trailer-provider.js'
import { ProviderNetworkError } from '../providers/tmdb/tmdb.errors.js'
import { createFakeTrailerProvider, sampleTrailerVideo } from '../test/fixtures/fakeTrailerProvider.js'
import type { CatalogCache, CacheResult } from './catalog-cache.js'
import { CatalogCache as RealCatalogCache } from './catalog-cache.js'
import { TrailerService } from './trailer.service.js'

const FRESH_MS = 1000
const STALE_MS = 10_000

interface Harness {
  readonly service: TrailerService
  readonly provider: ReturnType<typeof createFakeTrailerProvider>
  readonly advance: (milliseconds: number) => void
}

const harness = (): Harness => {
  let now = Date.parse('2026-11-24T12:00:00.000Z')
  const provider = createFakeTrailerProvider([sampleTrailerVideo()])
  const cache = new RealCatalogCache({
    freshTtlMs: FRESH_MS,
    staleTtlMs: STALE_MS,
    maxEntries: 10,
    now: () => now,
  })
  const service = new TrailerService({
    provider,
    cache,
    freshnessWindowMs: FRESH_MS,
    retentionMs: STALE_MS,
    now: () => now,
  })
  return {
    service,
    provider,
    advance: (milliseconds) => {
      now += milliseconds
    },
  }
}

const request = { mediaType: 'movie' as const, providerId: 550 }

const stubCache = (result: CacheResult<ProviderTrailerInventory>): CatalogCache =>
  ({ getOrLoad: () => Promise.resolve(result) }) as unknown as CatalogCache

describe('TrailerService freshness and retention', () => {
  it('serves a fresh entry as current from the cache', async () => {
    const { service } = harness()
    await service.getTrailers(request)
    const second = await service.getTrailers(request)

    expect(second.meta).toMatchObject({ stale: false, source: 'cache', freshness: 'current' })
  })

  it('labels a last-known entry as stale when the provider fails within retention', async () => {
    const { service, provider, advance } = harness()
    await service.getTrailers(request)
    advance(FRESH_MS + 1)
    provider.fetchTrailers.mockRejectedValueOnce(new ProviderNetworkError())

    const result = await service.getTrailers(request)

    expect(result.meta).toMatchObject({ stale: true, source: 'stale-cache', freshness: 'stale' })
  })

  it('rejects a last-known entry beyond the retention boundary', async () => {
    const { service, provider, advance } = harness()
    await service.getTrailers(request)
    advance(STALE_MS + 1)
    provider.fetchTrailers.mockRejectedValueOnce(new ProviderNetworkError())

    await expect(service.getTrailers(request)).rejects.toMatchObject({
      code: 'CATALOG_UNAVAILABLE',
    })
  })

  it('rejects cached data older than retention even when the cache reports it fresh', async () => {
    const now = Date.now()
    const cache = stubCache({
      value: { videos: [sampleTrailerVideo()] },
      stale: false,
      source: 'cache',
      lastUpdatedAt: new Date(now - STALE_MS - 1).toISOString(),
    })
    const service = new TrailerService({
      provider: createFakeTrailerProvider(),
      cache,
      freshnessWindowMs: FRESH_MS,
      retentionMs: STALE_MS,
      now: () => now,
    })

    await expect(service.getTrailers(request)).rejects.toMatchObject({
      code: 'CATALOG_UNAVAILABLE',
    })
  })

  it('labels an old but retained entry as stale and keeps the observation time', async () => {
    const now = Date.now()
    const lastUpdatedAt = new Date(now - FRESH_MS - 100).toISOString()
    const cache = stubCache({
      value: { videos: [sampleTrailerVideo()] },
      stale: false,
      source: 'cache',
      lastUpdatedAt,
    })
    const service = new TrailerService({
      provider: createFakeTrailerProvider(),
      cache,
      freshnessWindowMs: FRESH_MS,
      retentionMs: STALE_MS,
      now: () => now,
    })

    const result = await service.getTrailers(request)

    expect(result.meta).toMatchObject({
      stale: true,
      freshness: 'stale',
      lastUpdatedAt,
      source: 'cache',
    })
  })

  it('rejects an unparseable observation timestamp', async () => {
    const cache = stubCache({
      value: { videos: [] },
      stale: false,
      source: 'cache',
      lastUpdatedAt: 'not-a-date',
    })
    const service = new TrailerService({
      provider: createFakeTrailerProvider(),
      cache,
      freshnessWindowMs: FRESH_MS,
      retentionMs: STALE_MS,
    })

    await expect(service.getTrailers(request)).rejects.toMatchObject({
      code: 'CATALOG_INVALID_RESPONSE',
    })
  })
})
