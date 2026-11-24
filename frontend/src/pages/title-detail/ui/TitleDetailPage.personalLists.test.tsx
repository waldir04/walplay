import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY } from '@/entities/saved-library'
import { CatalogApiError } from '@/shared/api/httpClient'
import { MOVIE_ID } from '@/test/fixtures/detail'
import {
  collectionEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
import { availabilityRegionsEnvelope } from '@/test/fixtures/availability'
import { savedEnvelope, savedEntry } from '@/test/fixtures/saved'
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

const seedLibrary = (entries: readonly ReturnType<typeof savedEntry>[] = []): void => {
  window.localStorage.setItem(
    SAVED_LIBRARY_STORAGE_KEY,
    JSON.stringify(savedEnvelope({ watchlist: [...entries] }))
  )
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
}

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  vi.mocked(fetchAvailability).mockReset()
  vi.mocked(fetchAvailabilityRegions)
    .mockReset()
    .mockResolvedValue(availabilityRegionsEnvelope(['CO', 'US']))
  seedLibrary()
})

const renderMovie = (capabilities?: {
  readonly trailer: boolean
  readonly availability: boolean
  readonly personalLists: boolean
}) =>
  renderWithProviders(
    capabilities === undefined ? (
      <TitleDetailPage />
    ) : (
      <TitleDetailPage capabilities={capabilities} />
    ),
    { initialEntries: [`/browse/movies/title/${MOVIE_ID}`] }
  )

describe('TitleDetailPage personal lists', () => {
  it('reflects the stored watchlist membership', async () => {
    seedLibrary([savedEntry()])
    await renderMovie()

    expect(
      await screen.findByRole('button', { name: 'Remove Fight Club from watchlist' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps membership across a remount', async () => {
    const first = await renderMovie()
    const addButton = await screen.findByRole('button', { name: 'Add Fight Club to watchlist' })

    fireEvent.click(addButton)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Fight Club from watchlist' })
      ).toBeInTheDocument()
    )

    first.unmount()
    await renderMovie()

    expect(
      await screen.findByRole('button', { name: 'Remove Fight Club from watchlist' })
    ).toBeInTheDocument()
  })

  it('remains usable when availability fails', async () => {
    vi.mocked(fetchAvailability).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
    await renderMovie({ trailer: false, availability: true, personalLists: true })

    const addButton = await screen.findByRole('button', {
      name: 'Add Fight Club to watchlist',
    })
    fireEvent.click(addButton)

    expect(
      await screen.findByRole('button', { name: 'Remove Fight Club from watchlist' })
    ).toBeInTheDocument()
  })

  it('never renders personal controls for a title that is not found', async () => {
    vi.mocked(fetchDetail).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    await renderMovie()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Title not found' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /watchlist|favorite/i })).toBeNull()
  })
})
