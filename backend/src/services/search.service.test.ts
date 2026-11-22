import { describe, expect, it, vi } from 'vitest'

import type { CatalogItem } from '../domain/catalog.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import type { SearchProvider } from '../providers/search-provider.js'
import { CatalogCache } from './catalog-cache.js'
import { CatalogError } from '../domain/errors.js'
import { SearchService } from './search.service.js'

const item: CatalogItem = {
  id: 'd2wxOm1vdmllOjU1MA',
  mediaType: 'movie',
  title: 'Fight Club',
  genres: [],
}

interface HarnessOptions {
  readonly now?: () => number
  readonly freshTtlMs?: number
  readonly staleTtlMs?: number
}

const createHarness = (
  fetchSearchPage: SearchProvider['fetchSearchPage'],
  options: HarnessOptions = {}
) => {
  const provider: SearchProvider = { id: 'tmdb', fetchSearchPage }
  const cache = new CatalogCache({
    freshTtlMs: options.freshTtlMs ?? 1000,
    staleTtlMs: options.staleTtlMs ?? 10_000,
    maxEntries: 10,
    ...(options.now === undefined ? {} : { now: options.now }),
  })
  return { provider, cache, service: new SearchService({ provider, cache }) }
}

const validRequest = {
  query: 'fight club',
  language: 'en-US' as const,
  page: 1,
}

describe('SearchService', () => {
  it('isolates every result-affecting component in the cache key', async () => {
    const calls: string[] = []
    const fetchSearchPage = vi.fn(async ({ query, language, page }) => {
      calls.push(`${query}|${language}|${page}`)
      return { page, items: [item], totalPages: 5 }
    })
    const { service } = createHarness(fetchSearchPage)

    await service.getSearchPage(validRequest)
    await service.getSearchPage({ ...validRequest, language: 'es-ES' })
    await service.getSearchPage({ ...validRequest, page: 2 })
    await service.getSearchPage({ ...validRequest, query: 'arrival' })

    expect(calls).toHaveLength(4)
  })

  it('reuses a fresh cached page for a normalized duplicate query', async () => {
    const fetchSearchPage = vi.fn(async ({ page }) => ({ page, items: [item], totalPages: 5 }))
    const { service } = createHarness(fetchSearchPage)

    await service.getSearchPage({ ...validRequest, query: 'The   Matrix' })
    const second = await service.getSearchPage({ ...validRequest, query: '  the matrix  ' })

    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query: 'The   Matrix',
      language: 'en-US',
      page: 1,
    })
    expect(second.meta).toMatchObject({ stale: false, source: 'cache' })
  })

  it('serves stale data with the original timestamp after a provider failure in the stale window', async () => {
    let now = 0
    const fetchSearchPage = vi
      .fn<SearchProvider['fetchSearchPage']>()
      .mockResolvedValueOnce({ page: 1, items: [item], totalPages: 2 })
      .mockRejectedValueOnce(new ProviderNetworkError())
    const { service } = createHarness(fetchSearchPage, {
      now: () => now,
      freshTtlMs: 1000,
      staleTtlMs: 5000,
    })

    const first = await service.getSearchPage(validRequest)
    now = 2000
    const second = await service.getSearchPage(validRequest)

    expect(second.meta).toMatchObject({
      stale: true,
      source: 'stale-cache',
      lastUpdatedAt: first.meta.lastUpdatedAt,
    })
    expect(second.data.items).toEqual([item])
  })

  it('shares one in-flight provider request for concurrent identical misses', async () => {
    let resolvePage: ((value: { page: number; items: CatalogItem[]; totalPages: number }) => void) | undefined
    const fetchSearchPage = vi.fn<SearchProvider['fetchSearchPage']>(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve
        })
    )
    const { service } = createHarness(fetchSearchPage)

    const first = service.getSearchPage(validRequest)
    const second = service.getSearchPage({ ...validRequest, query: '  FIGHT   club ' })
    resolvePage?.({ page: 1, items: [item], totalPages: 2 })

    const [left, right] = await Promise.all([first, second])
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
    expect(left.data).toEqual(right.data)
  })

  it('echoes the requested page and derives hasMore from provider page metadata', async () => {
    const fetchSearchPage = vi.fn(async () => ({ page: 99, items: [item], totalPages: 3 }))
    const { service } = createHarness(fetchSearchPage)

    const result = await service.getSearchPage({ ...validRequest, page: 2 })

    expect(result.data.page).toBe(2)
    expect(result.data.totalPages).toBe(3)
    expect(result.data.hasMore).toBe(true)
    expect(result.data).not.toHaveProperty('totalResults')
  })

  it('keeps hasMore true for an empty page with more pages and false without totalPages', async () => {
    const withMore = createHarness(async ({ page }) => ({ page, items: [], totalPages: 2 }))
    const withoutMore = createHarness(async ({ page }) => ({ page, items: [item] }))

    expect((await withMore.service.getSearchPage(validRequest)).data).toMatchObject({
      items: [],
      hasMore: true,
    })
    const noMetadata = await withoutMore.service.getSearchPage(validRequest)
    expect(noMetadata.data.hasMore).toBe(false)
    expect(noMetadata.data.totalPages).toBeUndefined()
  })

  it('rejects invalid query shapes and pages before reaching the provider', async () => {
    const fetchSearchPage = vi.fn<SearchProvider['fetchSearchPage']>()
    const { service } = createHarness(fetchSearchPage)

    for (const request of [
      { ...validRequest, query: ' ' },
      { ...validRequest, query: 'a' },
      { ...validRequest, query: '😀'.repeat(201) },
      { ...validRequest, page: 0 },
      { ...validRequest, page: 1.5 },
      { ...validRequest, page: 1001 },
    ]) {
      await expect(service.getSearchPage(request)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      })
    }
    expect(fetchSearchPage).not.toHaveBeenCalled()
  })

  it('accepts a 200-code-point astral query', async () => {
    const fetchSearchPage = vi.fn(async ({ page }) => ({ page, items: [], totalPages: 1 }))
    const { service } = createHarness(fetchSearchPage)

    await expect(
      service.getSearchPage({ ...validRequest, query: '😀'.repeat(200) })
    ).resolves.toBeDefined()
  })

  it('maps provider failures to stable codes and keeps the shared catalog mapper unchanged', async () => {
    const cases: readonly [Error, string][] = [
      [new ProviderRateLimitError(), 'CATALOG_RATE_LIMITED'],
      [new ProviderTimeoutError(), 'CATALOG_TIMEOUT'],
      [new ProviderNetworkError(), 'CATALOG_UNAVAILABLE'],
      [new ProviderHttpError(503), 'CATALOG_UNAVAILABLE'],
      [new ProviderHttpError(401), 'CATALOG_UNAVAILABLE'],
      [new ProviderValidationError(), 'CATALOG_INVALID_RESPONSE'],
      [new Error('boom'), 'INTERNAL_ERROR'],
    ]

    for (const [error, code] of cases) {
      const { service } = createHarness(async () => {
        throw error
      })
      await expect(service.getSearchPage(validRequest)).rejects.toMatchObject({ code })
    }
  })

  it('maps provider 400 and 422 to VALIDATION_ERROR through a search-local branch', async () => {
    for (const status of [400, 422]) {
      const { service } = createHarness(async () => {
        throw new ProviderHttpError(status)
      })
      await expect(service.getSearchPage(validRequest)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }
  })

  it('never includes the query text in a mapped error', async () => {
    const { service } = createHarness(async () => {
      throw new ProviderHttpError(500)
    })

    try {
      await service.getSearchPage({ ...validRequest, query: 'private query text' })
      throw new Error('expected failure')
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError)
      expect(String((error as Error).message)).not.toContain('private query text')
    }
  })
})
