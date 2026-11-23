import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import {
  MOVIE_ID,
  TV_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
  similarEnvelope,
  tvDetail,
} from '@/test/fixtures/detail'
import { availabilityRegionsEnvelope, availableEnvelope } from '@/test/fixtures/availability'
import { installMatchMediaMock } from '@/test/matchMedia'
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

vi.mock('@/entities/catalog/api/availabilityClient', () => ({
  createAvailabilityClient: vi.fn(),
  getAvailabilityClient: vi.fn(),
  fetchAvailability: vi.fn(),
  fetchAvailabilityRegions: vi.fn(),
}))

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')
const { fetchAvailability, fetchAvailabilityRegions } =
  await import('@/entities/catalog/api/availabilityClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(creditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchAvailability).mockReset().mockResolvedValue(availableEnvelope())
  vi.mocked(fetchAvailabilityRegions)
    .mockReset()
    .mockResolvedValue(availabilityRegionsEnvelope(['CO', 'US']))
})

const renderMovie = (capabilities = { trailer: false, availability: true }) =>
  renderWithProviders(<TitleDetailPage capabilities={capabilities} />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage availability', () => {
  it('renders no section and issues no availability requests when the capability is off', async () => {
    await renderMovie({ trailer: false, availability: false })
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' })

    expect(screen.queryByRole('heading', { name: 'Where to watch' })).toBeNull()
    expect(fetchAvailability).not.toHaveBeenCalled()
    expect(fetchAvailabilityRegions).not.toHaveBeenCalled()
    expect(screen.getByText(/This product uses the TMDB API/)).toBeInTheDocument()
  })

  it('renders the section and queries the default region when the capability is on', async () => {
    await renderMovie()

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Where to watch' })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({
        mediaType: 'movie',
        itemId: MOVIE_ID,
        region: 'CO',
      })
    )
    expect(fetchAvailabilityRegions).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Availability in Colombia (CO)')).toBeInTheDocument()
    expect(screen.getByText('HBO Max')).toBeInTheDocument()
  })

  it('places the section after the action area and before seasons and credits', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(
      detailEnvelope(
        tvDetail({
          trailer: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', site: 'youtube' },
        })
      )
    )
    vi.mocked(fetchSeason).mockResolvedValue(seasonEnvelope(1))
    await renderWithProviders(
      <TitleDetailPage capabilities={{ trailer: true, availability: true }} />,
      { initialEntries: [`/browse/tv-shows/title/${TV_ID}`] }
    )

    const availability = await screen.findByRole('heading', {
      level: 2,
      name: 'Where to watch',
    })
    const actions = screen.getByRole('heading', { level: 2, name: 'Actions' })
    const seasons = screen.getByRole('heading', { level: 2, name: 'Seasons' })
    const cast = await screen.findByRole('heading', { level: 2, name: 'Cast' })

    expect(
      actions.compareDocumentPosition(availability) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      availability.compareDocumentPosition(seasons) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      availability.compareDocumentPosition(cast) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('works for TV titles', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope(tvDetail()))
    await renderWithProviders(
      <TitleDetailPage capabilities={{ trailer: false, availability: true }} />,
      { initialEntries: [`/browse/tv-shows/title/${TV_ID}`] }
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Where to watch' })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({
        mediaType: 'tv',
        itemId: TV_ID,
        region: 'CO',
      })
    )
  })

  it('renders no availability content for a not-found title', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    await renderMovie()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Where to watch' })).toBeNull()
    expect(fetchAvailability).not.toHaveBeenCalled()
    expect(fetchAvailabilityRegions).not.toHaveBeenCalled()
  })
})
