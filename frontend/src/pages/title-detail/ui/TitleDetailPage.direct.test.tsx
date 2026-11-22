import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { TitleDetailPage } from './TitleDetailPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchItem } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchItem).mockReset()
})

const envelope = () => ({
  data: movieItem(),
  meta: {
    language: 'en-US' as const,
    stale: false,
    lastUpdatedAt: '2026-11-22T15:00:00.000Z',
    source: 'provider' as const,
  },
})

describe('TitleDetailPage direct address', () => {
  it('shows a skeleton, resolves the minimal lookup, and shows card metadata', async () => {
    vi.mocked(fetchItem).mockResolvedValue(envelope())
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('1999')).toBeInTheDocument()
    expect(screen.getByText('8.4 / 10')).toBeInTheDocument()
    expect(
      screen.getByText('Complete details are not yet available for this title.')
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
    expect(fetchItem).toHaveBeenCalledWith({ mediaType: 'movie', itemId: MOVIE_ID, language: 'en' })
  })

  it('shows a localized not-found state with a working return for unknown titles', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Title not found')
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
    expect(document.body.textContent).not.toContain('404')
    expect(document.body.textContent).not.toContain('CATALOG_NOT_FOUND')
  })

  it('shows an unavailable state without fabricated metadata', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/tv-shows/title/d2wxOnR2OjEzOTk`],
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('The catalog took too long')
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/tv-shows'
    )
  })
})
