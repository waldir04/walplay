import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { encodeItemId } from '../lib/itemId.js'
import { createLogger } from '../lib/logger.js'
import {
  ProviderNetworkError,
  ProviderHttpError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import {
  createFakeAvailabilityProvider,
  emptyProviderAvailability,
  sampleProviderAvailability,
} from '../test/fixtures/fakeAvailabilityProvider.js'
import type { FakeAvailabilityProvider } from '../test/fixtures/fakeAvailabilityProvider.js'
import { createTestDetailService } from '../test/fixtures/fakeDetailProvider.js'
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import { createTestSearchService } from '../test/fixtures/fakeSearchProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'
import { AvailabilityService } from '../services/availability.service.js'
import type { Logger } from '../lib/logger.js'

let server: TestServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

const createAvailabilityService = (provider: FakeAvailabilityProvider) =>
  new AvailabilityService({
    provider,
    cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 20 }),
    supportedRegions: ['CO'],
    freshnessWindowMs: 86_400_000,
    retentionMs: 604_800_000,
  })

const buildApp = (options: {
  readonly provider?: FakeAvailabilityProvider
  readonly logger?: Logger
  readonly availabilityEnabled?: boolean
} = {}) => {
  const provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  return createApp({
    config: { ...TEST_CONFIG, availabilityEnabled: options.availabilityEnabled ?? true },
    service: new CatalogService({ provider, cache }),
    searchService: createTestSearchService(),
    detailService: createTestDetailService(),
    ...(options.availabilityEnabled === false
      ? {}
      : {
          availabilityService: createAvailabilityService(
            options.provider ?? createFakeAvailabilityProvider(sampleProviderAvailability())
          ),
        }),
    ...(options.logger === undefined ? {} : { logger: options.logger }),
  })
}

const availabilityPath = (
  mediaType: 'movie' | 'tv' = 'movie',
  providerId = 550,
  query = '?region=CO'
) => `/api/catalog/${mediaType}/titles/${encodeItemId(mediaType, providerId)}/availability${query}`

describe('availability routes', () => {
  it('returns an available result with no-store and a request id', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${availabilityPath()}`, {
      headers: { Origin: 'http://localhost:5173' },
    })
    const body = (await response.json()) as {
      data: { state: string; region: string; groups: unknown[] }
      meta: { source: string; stale: boolean }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    expect(body.data.state).toBe('available')
    expect(body.data.region).toBe('CO')
    expect(body.meta.source).toBe('provider')
  })

  it('returns no-information for a successful response without offers', async () => {
    server = await startTestServer(
      buildApp({ provider: createFakeAvailabilityProvider(emptyProviderAvailability()) })
    )

    const response = await fetch(`${server.baseUrl}${availabilityPath()}`)
    const body = (await response.json()) as { data: { state: string; groups: unknown[] } }

    expect(response.status).toBe(200)
    expect(body.data.state).toBe('no-information')
    expect(body.data.groups).toEqual([])
  })

  it('returns unsupported-region without meta and without a provider call', async () => {
    const provider = createFakeAvailabilityProvider(sampleProviderAvailability())
    server = await startTestServer(buildApp({ provider }))

    const response = await fetch(`${server.baseUrl}${availabilityPath('movie', 550, '?region=FR')}`)
    const body = (await response.json()) as { data: { state: string }; meta?: unknown }

    expect(response.status).toBe(200)
    expect(body.data.state).toBe('unsupported-region')
    expect(body.meta).toBeUndefined()
    expect(provider.fetchAvailability).not.toHaveBeenCalled()
  })

  it('serves the sorted region allowlist', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}/api/catalog/availability/regions`)
    const body = (await response.json()) as { data: { regions: string[] } }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.data.regions).toEqual(['CO'])
  })

  it('rejects malformed regions, unknown query parameters, and malformed item ids', async () => {
    server = await startTestServer(buildApp())

    const cases = [
      availabilityPath('movie', 550, '?region=USA'),
      availabilityPath('movie', 550, '?region=CO&language=en'),
      '/api/catalog/movie/titles/not-valid/availability?region=CO',
      '/api/catalog/availability/regions?region=CO',
    ]

    for (const path of cases) {
      const response = await fetch(`${server.baseUrl}${path}`)
      const body = (await response.json()) as { error: { code: string } }
      expect(response.status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('returns CATALOG_NOT_FOUND for a media-type mismatch', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${encodeItemId('tv', 1399)}/availability?region=CO`
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('CATALOG_NOT_FOUND')
  })

  it('maps provider failures to stable status codes', async () => {
    const cases: readonly [Error, number, string][] = [
      [new ProviderHttpError(404), 404, 'CATALOG_NOT_FOUND'],
      [new ProviderRateLimitError(), 429, 'CATALOG_RATE_LIMITED'],
      [new ProviderTimeoutError(), 504, 'CATALOG_TIMEOUT'],
      [new ProviderHttpError(500), 502, 'CATALOG_UNAVAILABLE'],
      [new ProviderNetworkError(), 502, 'CATALOG_UNAVAILABLE'],
      [new ProviderValidationError(), 502, 'CATALOG_INVALID_RESPONSE'],
    ]

    for (const [error, status, code] of cases) {
      server = await startTestServer(
        buildApp({ provider: createFakeAvailabilityProvider(error) })
      )
      const response = await fetch(`${server.baseUrl}${availabilityPath()}`)
      const body = (await response.json()) as { error: { code: string } }

      expect(response.status).toBe(status)
      expect(body.error.code).toBe(code)
      await server.close()
      server = undefined
    }
  })

  it('never leaks tokens, provider ids, source field names, or raw messages', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${availabilityPath()}`)
    const text = await response.text()

    for (const forbidden of [
      'test-token',
      'TMDB_ACCESS_TOKEN',
      '1899',
      'provider_id',
      'provider_name',
      'logo_path',
      'display_priority',
      'flatrate',
      'results',
      '"link"',
    ]) {
      expect(text).not.toContain(forbidden)
    }
  })

  it('does not log the region value or destination query string', async () => {
    const lines: string[] = []
    const logger = createLogger('debug', (line) => lines.push(line))
    server = await startTestServer(
      buildApp({ provider: createFakeAvailabilityProvider(new ProviderTimeoutError()), logger })
    )

    const response = await fetch(`${server.baseUrl}${availabilityPath()}`, {
      headers: { Origin: 'http://localhost:5173' },
    })

    expect(response.status).toBe(504)
    const logged = lines.join('\n')
    expect(logged).not.toContain('region=')
    expect(logged).not.toContain('locale=CO')
    expect(logged).not.toContain('test-token')
  })
})
