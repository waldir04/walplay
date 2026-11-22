import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { CatalogCategoryList } from './CatalogCategoryList'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('CatalogCategoryList accessibility', () => {
  it('has no critical or serious violations for a loaded multi-page category', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(
        pageEnvelope({ items: [movieItem(), secondMovieItem()], page: 1, hasMore: true })
      )
      .mockResolvedValueOnce(pageEnvelope({ items: [], page: 2, hasMore: false }))

    const { container, findByText } = await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await findByText('Fight Club')

    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
