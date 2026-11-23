import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { CatalogCache } from '../services/catalog-cache.js'
import { CatalogService } from '../services/catalog.service.js'
import { TEST_CONFIG, createFakeProvider } from '../test/fixtures/fakeProvider.js'
import { createTestDetailService } from '../test/fixtures/fakeDetailProvider.js'
import { createTestSearchService } from '../test/fixtures/fakeSearchProvider.js'
import type { FakeProvider } from '../test/fixtures/fakeProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'

let server: TestServer
let provider: FakeProvider

beforeEach(async () => {
  provider = createFakeProvider()
  const cache = new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 })
  const app = createApp({
    config: TEST_CONFIG,
    service: new CatalogService({ provider, cache }),
    searchService: createTestSearchService(),
    detailService: createTestDetailService(),
  })
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

interface PageBody {
  data: {
    page: number
    hasMore: boolean
    totalPages?: number
    totalResults?: number
    items: unknown[]
  }
}

describe('catalog pagination routes', () => {
  it('reports hasMore for a paginated category with a next page', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/popular?language=en`)
    const body = (await response.json()) as PageBody

    expect(response.status).toBe(200)
    expect(body.data.page).toBe(1)
    expect(body.data.hasMore).toBe(true)
    expect(body.data.totalPages).toBe(10)
  })

  it('reports hasMore false on the last page', async () => {
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 10,
      items: [],
      totalPages: 10,
      totalResults: 200,
    })
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/popular?language=en&page=10`)
    const body = (await response.json()) as PageBody
    expect(body.data.hasMore).toBe(false)
  })

  it('never paginates trending', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/tv/trending?language=en`)
    const body = (await response.json()) as PageBody
    expect(body.data.hasMore).toBe(false)
  })

  it('omits totals the provider does not report', async () => {
    provider.fetchSectionPage.mockResolvedValueOnce({ page: 1, items: [] })
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/popular?language=en`)
    const body = (await response.json()) as PageBody
    expect(body.data.totalPages).toBeUndefined()
    expect(body.data.totalResults).toBeUndefined()
    expect(body.data.hasMore).toBe(false)
  })

  it('rejects pages above the supported bound and unsupported sections', async () => {
    for (const path of [
      '/api/catalog/movie/popular?language=en&page=1001',
      '/api/catalog/movie/popular?language=en&page=-1',
      '/api/catalog/tv/discover?language=en',
    ]) {
      const response = await fetch(`${server.baseUrl}${path}`)
      expect(response.status, path).toBe(400)
    }
  })

  it('does not invent a page size', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/popular?language=en`)
    const text = await response.text()
    expect(text).not.toContain('pageSize')
    expect(text).not.toContain('perPage')
  })
})
