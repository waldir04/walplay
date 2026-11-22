import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import type { FakeProvider } from '../test/fixtures/fakeProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer
let provider: FakeProvider

beforeEach(async () => {
  provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  const app = createApp({ config: TEST_CONFIG, service: new CatalogService({ provider, cache }) })
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

const expectError = async (path: string, status: number, code: string): Promise<void> => {
  const response = await fetch(`${server.baseUrl}${path}`)
  const text = await response.text()
  const body = JSON.parse(text) as { error: { code: string; message: string; details?: unknown } }

  expect(response.status).toBe(status)
  expect(body.error.code).toBe(code)
  expect(text).not.toContain('secret-token')
  expect(text).not.toContain('TMDB_')
  expect(text).not.toContain('stack')
  expect(text).not.toContain('api.example.test')
}

describe('catalog error routes', () => {
  it('maps rate limiting to 429', async () => {
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderRateLimitError())
    await expectError('/api/catalog/movie/popular?language=en', 429, 'CATALOG_RATE_LIMITED')
  })

  it('maps provider timeout to 504', async () => {
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderTimeoutError())
    await expectError('/api/catalog/movie/popular?language=en', 504, 'CATALOG_TIMEOUT')
  })

  it('maps provider authorization and 5xx failures to 502', async () => {
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderHttpError(503))
    await expectError('/api/catalog/movie/popular?language=en', 502, 'CATALOG_UNAVAILABLE')

    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderHttpError(401))
    await expectError('/api/catalog/movie/popular?language=en', 502, 'CATALOG_UNAVAILABLE')
  })

  it('maps network and schema failures safely', async () => {
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderNetworkError())
    await expectError('/api/catalog/movie/popular?language=en', 502, 'CATALOG_UNAVAILABLE')

    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderValidationError())
    await expectError('/api/catalog/movie/popular?language=en', 502, 'CATALOG_INVALID_RESPONSE')
  })

  it('maps unexpected failures to 500 without technical detail', async () => {
    provider.fetchItem.mockRejectedValueOnce(new Error('internal stack detail'))
    const itemId = encodeItemId('movie', 1)
    await expectError(`/api/catalog/movie/titles/${itemId}?language=en`, 500, 'INTERNAL_ERROR')
  })

  it('returns ROUTE_NOT_FOUND for unknown API paths', async () => {
    await expectError('/api/catalog/unknown/route/path', 404, 'ROUTE_NOT_FOUND')
  })

  it('keeps the CORS allowlist on error responses', async () => {
    provider.fetchSectionPage.mockRejectedValueOnce(new ProviderNetworkError())
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/popular?language=en`, {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})
