import { describe, expect, it } from 'vitest'

import { CatalogError } from '../domain/errors.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import { createFakeProvider } from '../test/fixtures/fakeProvider.js'
import { CatalogCache } from './catalog-cache.js'
import { CatalogService, mapProviderError } from './catalog.service.js'

describe('catalog error classification', () => {
  it('maps provider conditions to stable catalog codes', () => {
    expect(mapProviderError(new ProviderRateLimitError()).code).toBe('CATALOG_RATE_LIMITED')
    expect(mapProviderError(new ProviderTimeoutError()).code).toBe('CATALOG_TIMEOUT')
    expect(mapProviderError(new ProviderHttpError(401)).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new ProviderHttpError(403)).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new ProviderHttpError(500)).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new ProviderNetworkError()).code).toBe('CATALOG_UNAVAILABLE')
    expect(mapProviderError(new ProviderValidationError()).code).toBe('CATALOG_INVALID_RESPONSE')
    expect(mapProviderError(new Error('boom')).code).toBe('INTERNAL_ERROR')
  })

  it('maps errors once in the service rather than exposing provider types', async () => {
    const provider = createFakeProvider()
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderRateLimitError())
    const service = new CatalogService({
      provider,
      cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 5 }),
    })

    await expect(
      service.getSectionPage({
        mediaType: 'movie',
        section: 'popular',
        language: 'en-US',
        page: 1,
      })
    ).rejects.toMatchObject({ code: 'CATALOG_RATE_LIMITED' })
  })

  it('preserves typed catalog errors', () => {
    const error = new CatalogError('VALIDATION_ERROR')
    expect(mapProviderError(error)).toBe(error)
  })

  it('never carries provider text into the mapped error', () => {
    const mapped = mapProviderError(new Error('TMDB_ACCESS_TOKEN=secret provider body'))
    expect(mapped.message).not.toContain('secret')
    expect(mapped.message).not.toContain('TMDB')
  })
})
