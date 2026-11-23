import { describe, expect, it } from 'vitest'

import type { AvailabilityServiceDependencies } from './availability.service.js'
import { AvailabilityService } from './availability.service.js'
import { CatalogCache } from './catalog-cache.js'
import { ProviderHttpError, ProviderTimeoutError } from '../providers/tmdb/tmdb.errors.js'
import {
  createFakeAvailabilityProvider,
  emptyProviderAvailability,
  sampleProviderAvailability,
} from '../test/fixtures/fakeAvailabilityProvider.js'
import type { FakeAvailabilityProvider } from '../test/fixtures/fakeAvailabilityProvider.js'

const BASE = Date.parse('2026-11-23T12:00:00.000Z')

interface HarnessOptions {
  readonly provider?: FakeAvailabilityProvider
  readonly freshTtlMs?: number
  readonly staleTtlMs?: number
  readonly regions?: readonly string[]
  readonly freshnessWindowMs?: number
  readonly retentionMs?: number
}

const createHarness = (options: HarnessOptions = {}) => {
  let now = BASE
  const provider = options.provider ?? createFakeAvailabilityProvider()
  const dependencies: AvailabilityServiceDependencies = {
    provider,
    cache: new CatalogCache({
      freshTtlMs: options.freshTtlMs ?? 1000,
      staleTtlMs: options.staleTtlMs ?? 10_000,
      maxEntries: 20,
      now: () => now,
    }),
    supportedRegions: options.regions ?? ['CO', 'US'],
    freshnessWindowMs: options.freshnessWindowMs ?? 86_400_000,
    retentionMs: options.retentionMs ?? 604_800_000,
    now: () => now,
  }
  const service = new AvailabilityService(dependencies)

  return {
    service,
    provider,
    advance: (milliseconds: number) => {
      now += milliseconds
    },
  }
}

describe('availability service', () => {
  it('returns the sorted region allowlist', () => {
    const { service } = createHarness({ regions: ['US', 'CO'] })

    expect(service.getRegions()).toEqual(['CO', 'US'])
  })

  it('returns unsupported-region without calling the provider', async () => {
    const { service, provider } = createHarness()

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'FR',
    })

    expect(result).toEqual({
      data: { state: 'unsupported-region', region: 'FR', groups: [] },
    })
    expect(result.meta).toBeUndefined()
    expect(provider.fetchAvailability).not.toHaveBeenCalled()
  })

  it('normalizes the requested region and defaults to CO', async () => {
    const { service, provider } = createHarness()

    const result = await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'co' })

    expect(result.data.region).toBe('CO')
    expect(provider.calls[0]?.region).toBe('CO')
  })

  it('rejects malformed regions and item identities', async () => {
    const { service } = createHarness()

    await expect(
      service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'C0' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(
      service.getAvailability({ mediaType: 'movie', providerId: 0, region: 'CO' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('maps a provider success to an available result with current freshness', async () => {
    const { service } = createHarness()

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(result.data.state).toBe('available')
    expect(result.data.groups).toHaveLength(2)
    expect(result.data.destination).toEqual({
      url: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
    })
    expect(result.meta).toMatchObject({
      stale: false,
      source: 'provider',
      freshness: 'current',
    })
  })

  it('serves a fresh cache entry as source=cache', async () => {
    const { service, provider } = createHarness({ freshTtlMs: 10_000 })

    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    const cached = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(provider.fetchAvailability).toHaveBeenCalledTimes(1)
    expect(cached.meta?.source).toBe('cache')
    expect(cached.meta?.stale).toBe(false)
  })

  it('surfaces a stale cache entry when the provider fails within retention', async () => {
    const provider = createFakeAvailabilityProvider(sampleProviderAvailability())
    const { service, advance } = createHarness({ provider, freshTtlMs: 1000, staleTtlMs: 10_000 })

    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    provider.fetchAvailability.mockRejectedValueOnce(new ProviderTimeoutError())
    advance(5000)

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(result.meta).toMatchObject({ stale: true, source: 'stale-cache' })
    expect(result.data.state).toBe('available')
  })

  it('computes freshness at the 24-hour boundary', async () => {
    const { service, advance } = createHarness({
      freshTtlMs: 604_800_000,
      staleTtlMs: 604_800_000,
    })

    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    advance(86_400_000)
    const atBoundary = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })
    advance(1)
    const beyondBoundary = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(atBoundary.meta).toMatchObject({ freshness: 'current', stale: false, source: 'cache' })
    expect(beyondBoundary.meta).toMatchObject({ freshness: 'stale', stale: true })
  })

  it('withholds offers beyond the last-known retention window', async () => {
    const { service, advance } = createHarness({
      freshTtlMs: 700_000_000,
      staleTtlMs: 700_000_000,
      retentionMs: 604_800_000,
    })

    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    advance(604_800_001)

    await expect(
      service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toMatchObject({ code: 'CATALOG_UNAVAILABLE' })
  })

  it('ignores invalid and future source timestamps', async () => {
    for (const sourceUpdatedAt of ['not-a-date', '2026-11-24T12:00:00.000Z']) {
      const provider = createFakeAvailabilityProvider({
        ...sampleProviderAvailability(),
        sourceUpdatedAt,
      })
      const { service } = createHarness({ provider })

      const result = await service.getAvailability({
        mediaType: 'movie',
        providerId: 550,
        region: 'CO',
      })

      expect(result.meta?.sourceUpdatedAt).toBeUndefined()
      expect(result.meta?.freshness).toBe('current')
    }
  })

  it('uses the earlier applicable source timestamp for freshness', async () => {
    const provider = createFakeAvailabilityProvider({
      ...sampleProviderAvailability(),
      sourceUpdatedAt: '2026-11-21T12:00:00.000Z',
    })
    const { service } = createHarness({ provider })

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(result.meta).toMatchObject({
      sourceUpdatedAt: '2026-11-21T12:00:00.000Z',
      freshness: 'stale',
      stale: true,
    })
  })

  it('maps a provider 404 to CATALOG_NOT_FOUND', async () => {
    const provider = createFakeAvailabilityProvider(new ProviderHttpError(404))
    const { service } = createHarness({ provider })

    await expect(
      service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it('maps provider failures to stable codes', async () => {
    const timeout = createHarness({
      provider: createFakeAvailabilityProvider(new ProviderTimeoutError()),
    })
    await expect(
      timeout.service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toMatchObject({ code: 'CATALOG_TIMEOUT' })

    const unavailable = createHarness({
      provider: createFakeAvailabilityProvider(new ProviderHttpError(500)),
    })
    await expect(
      unavailable.service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toMatchObject({ code: 'CATALOG_UNAVAILABLE' })
  })

  it('maps a missing country entry and an empty country entry to no-information', async () => {
    for (const provider of [
      createFakeAvailabilityProvider(null),
      createFakeAvailabilityProvider(emptyProviderAvailability()),
    ]) {
      const { service } = createHarness({ provider })
      const result = await service.getAvailability({
        mediaType: 'movie',
        providerId: 550,
        region: 'CO',
      })

      expect(result.data).toMatchObject({ state: 'no-information', groups: [] })
      expect(result.meta?.source).toBe('provider')
    }
  })

  it('retains a valid destination for no-information results', async () => {
    const { service } = createHarness({
      provider: createFakeAvailabilityProvider(emptyProviderAvailability()),
    })

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(result.data.destination).toEqual({
      url: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
    })
  })

  it('lets a current successful response supersede older cached offers', async () => {
    const provider = createFakeAvailabilityProvider(sampleProviderAvailability())
    const { service, advance } = createHarness({ provider, freshTtlMs: 1000 })

    const first = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })
    expect(first.data.state).toBe('available')

    provider.fetchAvailability.mockResolvedValueOnce(emptyProviderAvailability())
    advance(2000)
    const second = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(second.data.state).toBe('no-information')
    expect(second.meta?.source).toBe('provider')
  })

  it('separates cache entries by media type, provider id, and region', async () => {
    const { service, provider } = createHarness({
      freshTtlMs: 604_800_000,
      staleTtlMs: 604_800_000,
    })

    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'US' })
    await service.getAvailability({ mediaType: 'tv', providerId: 550, region: 'CO' })
    await service.getAvailability({ mediaType: 'movie', providerId: 551, region: 'CO' })
    await service.getAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })

    expect(provider.calls).toHaveLength(4)
  })

  it('serializes only provider-neutral data', async () => {
    const { service } = createHarness()

    const result = await service.getAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })
    const serialized = JSON.stringify(result)

    for (const forbidden of [
      'provider_id',
      'provider_name',
      'logo_path',
      'display_priority',
      'flatrate',
      'results',
      'link',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
