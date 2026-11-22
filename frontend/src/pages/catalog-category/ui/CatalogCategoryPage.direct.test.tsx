import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope, tvItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCategoryPage } from './CatalogCategoryPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(async ({ mediaType, section }) =>
      pageEnvelope({
        items: [mediaType === 'movie' ? movieItem() : tvItem()],
        section,
      })
    )
})

describe('CatalogCategoryPage direct addresses', () => {
  it('loads page one for the correct type and category only', async () => {
    await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/movies/top-rated'],
    })
    await screen.findByText('Fight Club')

    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'movie',
      section: 'top-rated',
      language: 'en',
      page: 1,
    })
    expect(screen.queryByText('Example Show')).not.toBeInTheDocument()
  })

  it('never restores previously loaded pages on a direct open', async () => {
    await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/tv-shows/popular'],
    })
    await screen.findAllByText('Example Show')
    await waitFor(() => expect(fetchSectionPage).toHaveBeenCalledTimes(1))
  })
})
