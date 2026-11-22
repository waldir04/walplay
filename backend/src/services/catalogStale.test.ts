import { describe, expect, it } from 'vitest'

import { ProviderNetworkError } from '../providers/tmdb/tmdb.errors.js'
import { createFakeProvider, sampleItem } from '../test/fixtures/fakeProvider.js'
import { CatalogCache } from './catalog-cache.js'
import { CatalogService } from './catalog.service.js'

const request = {
  mediaType: 'movie' as const,
  section: 'popular' as const,
  language: 'en-US' as const,
  page: 1,
}

describe('catalog stale metadata', () => {
  it('returns last-known-good data with labeled stale metadata', async () => {
    let now = Date.parse('2026-11-22T15:00:00.000Z')
    const provider = createFakeProvider()
    const service = new CatalogService({
      provider,
      cache: new CatalogCache({
        freshTtlMs: 1000,
        staleTtlMs: 86_400_000,
        maxEntries: 5,
        now: () => now,
      }),
    })

    await service.getSectionPage(request)
    now += 5000
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderNetworkError())
    const stale = await service.getSectionPage(request)

    expect(stale.meta).toEqual({
      language: 'en-US',
      stale: true,
      lastUpdatedAt: '2026-11-22T15:00:00.000Z',
      source: 'stale-cache',
    })
    expect(stale.data.items).toEqual([sampleItem()])
  })

  it('returns a stable error when no stale entry is usable', async () => {
    const provider = createFakeProvider()
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderNetworkError())
    const service = new CatalogService({
      provider,
      cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 5 }),
    })

    await expect(service.getSectionPage(request)).rejects.toMatchObject({
      code: 'CATALOG_UNAVAILABLE',
    })
  })

  it('does not mark fresh cache hits as stale', async () => {
    const service = new CatalogService({
      provider: createFakeProvider(),
      cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 5 }),
    })
    await service.getSectionPage(request)
    const cached = await service.getSectionPage(request)
    expect(cached.meta).toMatchObject({ stale: false, source: 'cache' })
  })
})
