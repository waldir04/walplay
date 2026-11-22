import { describe, expect, it } from 'vitest'

import { CatalogError } from '../domain/errors.js'
import { encodeItemId } from '../lib/itemId.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import { createFakeProvider, sampleItem } from '../test/fixtures/fakeProvider.js'
import { CatalogCache } from './catalog-cache.js'
import { CatalogService, mapProviderError } from './catalog.service.js'

const createService = (
  options: { freshTtlMs?: number; staleTtlMs?: number; now?: () => number } = {}
) => {
  const provider = createFakeProvider()
  const cache = new CatalogCache({
    freshTtlMs: options.freshTtlMs ?? 1000,
    staleTtlMs: options.staleTtlMs ?? 10_000,
    maxEntries: 50,
    ...(options.now === undefined ? {} : { now: options.now }),
  })
  return { provider, cache, service: new CatalogService({ provider, cache }) }
}

describe('CatalogService capabilities', () => {
  it('returns capabilities in declared order', async () => {
    const { service } = createService()
    const result = await service.getCapabilities()
    expect(result.sections.map((section) => section.id)).toEqual([
      'trending',
      'popular',
      'top-rated',
    ])
  })

  it('maps capability failures to a stable code', async () => {
    const { provider, service } = createService()
    provider.capabilities.mockRejectedValueOnce(new Error('boom'))
    await expect(service.getCapabilities()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
  })
})

describe('CatalogService section pages', () => {
  it('returns a page with computed hasMore for a paginated section', async () => {
    const { service, provider } = createService()
    const result = await service.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'en-US',
      page: 2,
    })

    expect(provider.fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'movie',
      section: 'popular',
      language: 'en-US',
      page: 2,
    })
    expect(result.data).toMatchObject({
      mediaType: 'movie',
      section: 'popular',
      page: 2,
      hasMore: true,
    })
    expect(result.data.totalPages).toBe(10)
    expect(result.meta).toMatchObject({ language: 'en-US', stale: false, source: 'provider' })
  })

  it('never offers pagination for trending and rejects pages above one', async () => {
    const { service, provider } = createService()
    const first = await service.getSectionPage({
      mediaType: 'movie',
      section: 'trending',
      language: 'en-US',
      page: 1,
    })
    expect(first.data.hasMore).toBe(false)

    await expect(
      service.getSectionPage({
        mediaType: 'movie',
        section: 'trending',
        language: 'en-US',
        page: 2,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(provider.fetchSectionPage).toHaveBeenCalledTimes(1)
  })

  it('rejects unsupported sections, invalid pages, and invalid media types', async () => {
    const { service } = createService()
    await expect(
      service.getSectionPage({
        mediaType: 'movie',
        section: 'popular',
        language: 'en-US',
        page: 0,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('serves labeled stale data when the provider fails after freshness', async () => {
    let now = 0
    const { service, provider } = createService({ now: () => now })
    const request = {
      mediaType: 'movie' as const,
      section: 'popular' as const,
      language: 'en-US' as const,
      page: 1,
    }

    await service.getSectionPage(request)
    now = 5000
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderNetworkError())

    const result = await service.getSectionPage(request)
    expect(result.meta).toMatchObject({ stale: true, source: 'stale-cache' })
    expect(result.data.items).toHaveLength(1)
  })

  it('does not serve stale data outside the stale window', async () => {
    let now = 0
    const { service, provider } = createService({ now: () => now })
    const request = {
      mediaType: 'movie' as const,
      section: 'popular' as const,
      language: 'en-US' as const,
      page: 1,
    }
    await service.getSectionPage(request)
    now = 20_000
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderTimeoutError())

    await expect(service.getSectionPage(request)).rejects.toMatchObject({ code: 'CATALOG_TIMEOUT' })
  })

  it('isolates cache entries per language', async () => {
    const { service, provider } = createService()
    await service.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'en-US',
      page: 1,
    })
    await service.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'es-ES',
      page: 1,
    })
    expect(provider.fetchSectionPage).toHaveBeenCalledTimes(2)
  })

  it('treats contradictory pagination metadata safely', async () => {
    const { service, provider } = createService()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [sampleItem()],
      totalPages: 0,
    })
    const result = await service.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'en-US',
      page: 1,
    })
    expect(result.data.hasMore).toBe(false)
  })
})

describe('CatalogService items', () => {
  const itemId = encodeItemId('movie', 550)

  it('returns a mapped item for a matching opaque id', async () => {
    const { service, provider } = createService()
    const result = await service.getItem({ mediaType: 'movie', itemId, language: 'en-US' })

    expect(provider.fetchItem).toHaveBeenCalledWith({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })
    expect(result.data.title).toBe('Fight Club')
    expect(result.meta).toMatchObject({ language: 'en-US', stale: false })
  })

  it('returns CATALOG_NOT_FOUND for malformed, mismatched, and unknown ids', async () => {
    const { service, provider } = createService()

    await expect(
      service.getItem({ mediaType: 'movie', itemId: 'not-a-token', language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })

    await expect(
      service.getItem({ mediaType: 'tv', itemId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })

    provider.fetchItem.mockResolvedValueOnce(null)
    await expect(
      service.getItem({ mediaType: 'movie', itemId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it('caches detail reads', async () => {
    const { service, provider } = createService()
    await service.getItem({ mediaType: 'movie', itemId, language: 'en-US' })
    await service.getItem({ mediaType: 'movie', itemId, language: 'en-US' })
    expect(provider.fetchItem).toHaveBeenCalledTimes(1)
  })
})

describe('mapProviderError', () => {
  it('maps provider failures to stable catalog codes once', () => {
    expect(mapProviderError(new ProviderRateLimitError()).code).toBe('CATALOG_RATE_LIMITED')
    expect(mapProviderError(new ProviderTimeoutError()).code).toBe('CATALOG_TIMEOUT')
    expect(mapProviderError(new ProviderValidationError()).code).toBe('CATALOG_INVALID_RESPONSE')
    expect(mapProviderError(new ProviderHttpError(500)).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new ProviderNetworkError()).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new Error('x')).code).toBe('INTERNAL_ERROR')
  })

  it('passes typed errors through unchanged', () => {
    const original = new CatalogError('VALIDATION_ERROR')
    expect(mapProviderError(original)).toBe(original)
  })

  it('never includes provider text or tokens', () => {
    const mapped = mapProviderError(new Error('TMDB_ACCESS_TOKEN secret-token'))
    expect(JSON.stringify(mapped)).not.toContain('secret')
  })
})

describe('CatalogService single-flight', () => {
  it('shares one provider request for identical concurrent reads', async () => {
    const { service, provider } = createService()
    const request = {
      mediaType: 'movie' as const,
      section: 'popular' as const,
      language: 'en-US' as const,
      page: 1,
    }
    await Promise.all([service.getSectionPage(request), service.getSectionPage(request)])
    expect(provider.fetchSectionPage).toHaveBeenCalledTimes(1)
  })
})

describe('CatalogService cache reuse', () => {
  it('does not call the provider on a fresh hit', async () => {
    const { service, provider } = createService()
    const request = {
      mediaType: 'tv' as const,
      section: 'top-rated' as const,
      language: 'es-ES' as const,
      page: 1,
    }
    await service.getSectionPage(request)
    const result = await service.getSectionPage(request)

    expect(provider.fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(result.meta.source).toBe('cache')
  })
})

describe('CatalogService unexpected errors', () => {
  it('maps unknown loader errors', async () => {
    const { service, provider } = createService()
    provider.fetchSectionPage.mockRejectedValueOnce(new Error('unexpected'))
    await expect(
      service.getSectionPage({
        mediaType: 'movie',
        section: 'popular',
        language: 'en-US',
        page: 1,
      })
    ).rejects.toBeInstanceOf(CatalogError)
  })
})

describe('CatalogService ordering', () => {
  it('keeps provider order without re-sorting', async () => {
    const { service, provider } = createService()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [sampleItem('movie', 3), sampleItem('movie', 1), sampleItem('movie', 2)],
    })
    const result = await service.getSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'en-US',
      page: 1,
    })
    expect(result.data.items.map((item) => item.id)).toEqual([
      encodeItemId('movie', 3),
      encodeItemId('movie', 1),
      encodeItemId('movie', 2),
    ])
  })
})
