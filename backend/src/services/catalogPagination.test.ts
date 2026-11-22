import { describe, expect, it } from 'vitest'

import { createFakeProvider, sampleItem } from '../test/fixtures/fakeProvider.js'
import { CatalogCache } from './catalog-cache.js'
import { CatalogService } from './catalog.service.js'

const build = () => {
  const provider = createFakeProvider()
  const service = new CatalogService({
    provider,
    cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 20 }),
  })
  return { provider, service }
}

const request = {
  mediaType: 'movie' as const,
  section: 'popular' as const,
  language: 'en-US' as const,
  page: 1,
}

describe('catalog pagination end conditions', () => {
  it('reports a next page only when the provider reports one', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [sampleItem()],
      totalPages: 4,
    })
    expect((await service.getSectionPage(request)).data.hasMore).toBe(true)
  })

  it('ends when the provider reports the current page as the last page', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [sampleItem()],
      totalPages: 1,
    })
    expect((await service.getSectionPage(request)).data.hasMore).toBe(false)
  })

  it('ends when no total page count is reported', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({ page: 1, items: [sampleItem()] })
    expect((await service.getSectionPage(request)).data.hasMore).toBe(false)
  })

  it('ends when the next page would exceed contradictory totals', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 3,
      items: [sampleItem()],
      totalPages: 0,
    })
    expect((await service.getSectionPage(request)).data.hasMore).toBe(false)
  })

  it('ends when a page has no valid items', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [],
      totalPages: 10,
    })
    expect((await service.getSectionPage(request)).data.hasMore).toBe(false)
  })

  it('never offers pagination for trending', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 1,
      items: [sampleItem()],
      totalPages: 10,
    })
    const result = await service.getSectionPage({ ...request, section: 'trending' })
    expect(result.data.hasMore).toBe(false)
  })

  it('keeps the provider page size untouched', async () => {
    const { provider, service } = build()
    provider.fetchSectionPage.mockResolvedValueOnce({
      page: 2,
      items: [sampleItem('movie', 1), sampleItem('movie', 2)],
      totalPages: 3,
    })
    const result = await service.getSectionPage({ ...request, page: 2 })
    expect(result.data.items).toHaveLength(2)
    expect(result.data.page).toBe(2)
  })
})
