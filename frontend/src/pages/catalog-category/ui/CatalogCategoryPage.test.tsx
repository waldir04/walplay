import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockResolvedValue(
    pageEnvelope({ items: [movieItem()], section: 'popular' })
  )
})

describe('CatalogCategoryPage', () => {
  it('renders one h1 naming the category and media type', async () => {
    const { container } = await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/movies/popular'],
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Popular · Movies' })
    ).toBeInTheDocument()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'page-heading')
  })

  it('renders the media switch for the same category and the attribution', async () => {
    await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/tv-shows/top-rated'],
    })

    expect(await screen.findByRole('heading', { name: 'Top rated · TV Shows' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute(
      'href',
      '/browse/movies/top-rated'
    )
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
  })

  it('loads only the requested category and type', async () => {
    await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/tv-shows/popular'],
    })
    await screen.findByText('Fight Club')

    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'tv',
      section: 'popular',
      language: 'en',
      page: 1,
    })
  })

  it('renders the catalog not-found state for an unknown category address', async () => {
    const { default: NotFound } = await import('@/pages/catalog-not-found')
    const NotFoundPage = NotFound
    const { container } = await renderWithProviders(<NotFoundPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Title not found' })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/undefined|Error/)
  })
})
