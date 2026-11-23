import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { secondMovieItem } from '@/test/fixtures/catalog'
import {
  MOVIE_ID,
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
  similarEnvelope,
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
  vi.mocked(fetchSimilar)
    .mockReset()
    .mockResolvedValue(similarEnvelope([secondMovieItem()]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchAvailabilityRegions)
    .mockReset()
    .mockResolvedValue(availabilityRegionsEnvelope(['CO']))
  vi.mocked(fetchAvailability).mockReset().mockResolvedValue(availableEnvelope())
})

const renderPage = () =>
  renderWithProviders(<TitleDetailPage capabilities={{ trailer: false, availability: true }} />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage availability failure isolation', () => {
  it('keeps the core title content usable when availability fails', async () => {
    vi.mocked(fetchAvailability).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
    await renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Availability could not be loaded')
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText(/A ticking-time-bomb insomniac/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Cast' })).toBeInTheDocument()
    expect(screen.getByText('Edward Norton')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Similar titles' })).toBeInTheDocument()
  })

  it('retries only the availability and region queries', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAvailability).mockRejectedValueOnce(
      new CatalogApiError('CATALOG_UNAVAILABLE', 502)
    )
    await renderPage()
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('HBO Max')).toBeInTheDocument()
    expect(fetchDetail).toHaveBeenCalledTimes(1)
    expect(fetchCredits).toHaveBeenCalledTimes(1)
    expect(fetchAvailability).toHaveBeenCalledTimes(2)
    expect(fetchAvailabilityRegions).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate concurrent retries', async () => {
    const user = userEvent.setup()
    let resolveRetry: ((value: Awaited<ReturnType<typeof fetchAvailability>>) => void) | undefined
    const pending = new Promise<Awaited<ReturnType<typeof fetchAvailability>>>((resolve) => {
      resolveRetry = resolve
    })
    vi.mocked(fetchAvailability)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockReturnValueOnce(pending)
    await renderPage()
    await screen.findByRole('alert')

    const retry = screen.getByRole('button', { name: 'Try again' })
    await user.click(retry)
    await user.click(retry)

    expect(fetchAvailability).toHaveBeenCalledTimes(2)
    resolveRetry?.(availableEnvelope())
    await screen.findByText('HBO Max')
  })

  it('keeps the same localized error after repeated failures', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAvailability)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    await renderPage()
    const firstAlert = await screen.findByRole('alert')
    expect(firstAlert).toHaveTextContent('Availability information is temporarily unavailable.')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    const secondAlert = await screen.findByRole('alert')
    expect(secondAlert).toHaveTextContent('Availability could not be loaded')
    expect(secondAlert).toHaveTextContent('The rest of the title page is still available.')
  })

  it('keeps the region line and omits an empty selector when the regions list fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAvailabilityRegions).mockRejectedValue(
      new CatalogApiError('CATALOG_UNAVAILABLE', 502)
    )
    await renderPage()

    await screen.findByRole('alert')
    expect(screen.getByText('Availability in Colombia (CO)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Availability region')).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()

    vi.mocked(fetchAvailabilityRegions).mockResolvedValue(availabilityRegionsEnvelope(['CO']))
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByLabelText('Availability region')).toBeInTheDocument())
    expect(await screen.findByText('HBO Max')).toBeInTheDocument()
  })
})
