import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  movieDetail,
  seasonEnvelope,
  similarEnvelope,
  tvDetail,
} from '@/test/fixtures/detail'
import { availableTrailerEnvelope, noVideosTrailerEnvelope } from '@/test/fixtures/trailer'
import { installMatchMediaMock } from '@/test/matchMedia'
import { stubMeasuredWidth } from '@/test/measuredWidth'
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

vi.mock('@/entities/catalog/api/trailerClient', () => ({
  createTrailerClient: vi.fn(),
  getTrailerClient: vi.fn(),
  fetchTrailers: vi.fn(),
}))

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')
const { fetchTrailers } = await import('@/entities/catalog/api/trailerClient')

const capabilities = { trailer: true, availability: false, personalLists: false }

beforeEach(() => {
  installMatchMediaMock(true)
  stubMeasuredWidth(800)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope(movieDetail()))
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(creditsEnvelope())
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchTrailers).mockReset().mockResolvedValue(availableTrailerEnvelope())
})

describe('TitleDetailPage trailer integration', () => {
  it('shows the section and entry anchor on a movie detail route', async () => {
    await renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Trailer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Watch trailer' })).toHaveAttribute(
      'href',
      '#trailer-heading'
    )
    expect(fetchTrailers).toHaveBeenCalledWith({ mediaType: 'movie', itemId: MOVIE_ID })
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('shows the section and entry anchor on a TV detail route', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    await renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
      initialEntries: [`/browse/tv-shows/title/${TV_ID}`],
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Dark' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Trailer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Watch trailer' })).toBeInTheDocument()
    expect(fetchTrailers).toHaveBeenCalledWith({ mediaType: 'tv', itemId: TV_ID })
  })

  it('moves focus to the section heading from the entry anchor', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    const entry = await screen.findByRole('link', { name: 'Watch trailer' })
    await user.click(entry)

    const heading = screen.getByRole('heading', { level: 2, name: 'Trailer' })
    expect(document.activeElement).toBe(heading)
  })

  it('keeps the labeled section but hides the entry when no eligible video exists', async () => {
    vi.mocked(fetchTrailers).mockResolvedValue(noVideosTrailerEnvelope())
    await renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    await screen.findByRole('heading', { level: 2, name: 'Trailer' })
    expect(screen.getByText('No trailer information available')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Watch trailer' })).toBeNull()
  })

  it('renders neither section nor entry when the capability is disabled', async () => {
    await renderWithProviders(
      <TitleDetailPage
        capabilities={{ trailer: false, availability: false, personalLists: false }}
      />,
      { initialEntries: [`/browse/movies/title/${MOVIE_ID}`] }
    )

    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })
    await waitFor(() => expect(fetchTrailers).not.toHaveBeenCalled())
    expect(screen.queryByRole('heading', { level: 2, name: 'Trailer' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Watch trailer' })).toBeNull()
    expect(screen.queryByText(/coming soon/i)).toBeNull()
  })

  it('keeps the rest of the page available when the inventory fails', async () => {
    vi.mocked(fetchTrailers).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    await renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
      initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Trailer information is unavailable')
    expect(screen.queryByRole('link', { name: 'Watch trailer' })).toBeNull()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(await screen.findByText('Edward Norton')).toBeInTheDocument()
  })

  it('places the section after the action area and before availability', async () => {
    vi.mocked(fetchTrailers).mockResolvedValue(availableTrailerEnvelope())
    await renderWithProviders(
      <TitleDetailPage
        capabilities={{ trailer: true, availability: false, personalLists: true }}
      />,
      { initialEntries: [`/browse/movies/title/${MOVIE_ID}`] }
    )

    const actions = await screen.findByRole('heading', { level: 2, name: 'Actions' })
    const trailer = await screen.findByRole('heading', { level: 2, name: 'Trailer' })
    expect(actions.compareDocumentPosition(trailer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
