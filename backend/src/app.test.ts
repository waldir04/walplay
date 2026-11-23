import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from './app.js'
import { CatalogCache } from './services/catalog-cache.js'
import { CatalogService } from './services/catalog.service.js'
import { TEST_CONFIG, createFakeProvider } from './test/fixtures/fakeProvider.js'
import { createTestDetailService } from './test/fixtures/fakeDetailProvider.js'
import { createTestSearchService } from './test/fixtures/fakeSearchProvider.js'
import { startTestServer } from './test/fixtures/testServer.js'
import type { TestServer } from './test/fixtures/testServer.js'

let server: TestServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

const buildApp = () => {
  const provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  return createApp({
    config: TEST_CONFIG,
    service: new CatalogService({ provider, cache }),
    searchService: createTestSearchService(),
    detailService: createTestDetailService(),
  })
}

describe('app composition', () => {
  it('serves health without calling the provider', async () => {
    const provider = createFakeProvider()
    const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
    const app = createApp({
      config: TEST_CONFIG,
      service: new CatalogService({ provider, cache }),
      searchService: createTestSearchService(),
      detailService: createTestDetailService(),
    })
    server = await startTestServer(app)

    const response = await fetch(`${server.baseUrl}/api/health`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
    expect(provider.capabilities).not.toHaveBeenCalled()
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('returns the stable ROUTE_NOT_FOUND envelope for unknown routes', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}/api/unknown`)
    const body = (await response.json()) as { error: { code: string; message: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('ROUTE_NOT_FOUND')
    expect(response.headers.get('X-Request-Id')).toBeTruthy()
  })

  it('never exposes the provider credential', async () => {
    server = await startTestServer(buildApp())

    const responses = await Promise.all([
      fetch(`${server.baseUrl}/api/health`),
      fetch(`${server.baseUrl}/api/catalog/capabilities`),
      fetch(`${server.baseUrl}/api/unknown`),
    ])
    const text = (await Promise.all(responses.map((response) => response.text()))).join(' ')

    expect(text).not.toContain('test-token')
    expect(text).not.toContain('TMDB_ACCESS_TOKEN')
    expect(text).not.toContain('api.example.test')
  })
})
