import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY } from '@/entities/saved-library'
import {
  MOVIE_ID,
  collectionEnvelope,
  detailEnvelope,
  emptyCreditsEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
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

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('@/entities/catalog/api/detailClient')

const seedLibrary = (watchlist: number, favorites: number): void => {
  const entry = savedEntry()
  window.localStorage.setItem(
    SAVED_LIBRARY_STORAGE_KEY,
    JSON.stringify(
      savedEnvelope({
        watchlist: Array.from({ length: watchlist }, () => entry),
        favorites: Array.from({ length: favorites }, () => entry),
      })
    )
  )
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
}

const storedCounts = (): { watchlist: number; favorites: number } => {
  const parsed = JSON.parse(window.localStorage.getItem(SAVED_LIBRARY_STORAGE_KEY) ?? '{}') as {
    watchlist?: unknown[]
    favorites?: unknown[]
  }
  return { watchlist: parsed.watchlist?.length ?? 0, favorites: parsed.favorites?.length ?? 0 }
}

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchDetail).mockReset().mockResolvedValue(detailEnvelope())
  vi.mocked(fetchCredits).mockReset().mockResolvedValue(emptyCreditsEnvelope())
  vi.mocked(fetchSeason).mockReset().mockResolvedValue(seasonEnvelope(1))
  vi.mocked(fetchSimilar).mockReset().mockResolvedValue(similarEnvelope([]))
  vi.mocked(fetchCollection).mockReset().mockResolvedValue(collectionEnvelope([]))
  seedLibrary(0, 0)
})

const renderMovie = () =>
  renderWithProviders(<TitleDetailPage />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage both collections', () => {
  it('shows a title as saved in both collections independently', async () => {
    seedLibrary(1, 1)
    await renderMovie()

    expect(
      await screen.findByRole('button', { name: 'Remove Fight Club from watchlist' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Fight Club from favorites' })
    ).toBeInTheDocument()
  })

  it('reflects only its own collection when saved in favorites', async () => {
    seedLibrary(0, 1)
    await renderMovie()

    expect(
      await screen.findByRole('button', { name: 'Add Fight Club to watchlist' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Fight Club from favorites' })
    ).toBeInTheDocument()
  })

  it('removing from one collection leaves the other and its count unchanged', async () => {
    seedLibrary(1, 1)
    await renderMovie()

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Fight Club from watchlist' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Fight Club to watchlist' })
      ).toBeInTheDocument()
    )
    expect(
      screen.getByRole('button', { name: 'Remove Fight Club from favorites' })
    ).toBeInTheDocument()
    expect(storedCounts()).toEqual({ watchlist: 0, favorites: 1 })
  })
})
