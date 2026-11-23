import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  detailEnvelope,
  tvDetail,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
  collectionEnvelope,
} from '@/test/fixtures/detail'
import { renderWithProviders } from '@/test/renderWithProviders'

import { TitleDetailPage } from './TitleDetailPage'

vi.mock('@/entities/catalog/api/detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

const { fetchCredits, fetchDetail, fetchSeason, fetchSimilar, fetchCollection } =
  await import('@/entities/catalog/api/detailClient')

beforeEach(() => {
  vi.mocked(fetchDetail).mockReset()
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
})

describe('TitleDetailPage direct address', () => {
  it('shows a skeleton then the complete identity and facts', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    const { container } = await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('October 15, 1999')).toBeInTheDocument()
    expect(screen.getByText('2 h 19 min')).toBeInTheDocument()
    expect(screen.getByText('8.4 / 10')).toBeInTheDocument()
    expect(screen.getByText('Released')).toBeInTheDocument()
    expect(screen.getByText(/ticking-time-bomb insomniac/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
    expect(fetchDetail).toHaveBeenCalledWith({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      language: 'en',
    })
  })

  it('shows a localized not-found state distinct from an error', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
    expect(document.body.textContent).not.toContain('404')
    expect(document.body.textContent).not.toContain('CATALOG_NOT_FOUND')
  })

  it('shows a recoverable page error with retry and return', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/tv-shows/title/${TV_ID}`],
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Title details are unavailable')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/tv-shows'
    )
  })

  it('renders a malformed address as not-found without issuing a request', async () => {
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: ['/browse/movies/title/bad'],
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Title not found' })).toBeInTheDocument()
    expect(fetchDetail).not.toHaveBeenCalled()
  })

  it('preserves the title on a language switch', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    await renderWithProviders(<TitleDetailPage />, {
      initialEntries: [`/browse/tv-shows/title/${TV_ID}`],
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()

    const { i18n } = await import('@/app/i18n')
    await i18n.changeLanguage('es')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dark'))
    await waitFor(() =>
      expect(fetchDetail).toHaveBeenLastCalledWith({
        mediaType: 'tv',
        itemId: TV_ID,
        language: 'es',
      })
    )
  })
})
