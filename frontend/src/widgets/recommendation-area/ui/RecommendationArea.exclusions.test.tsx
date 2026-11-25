import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY, getSavedLibraryStore } from '@/entities/saved-library'
import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
import { savedEnvelope, savedEntry, savedTvEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

vi.mock('@/shared/config/env', () => ({
  getAppConfig: () => ({
    environmentName: 'local',
    applicationVersion: '0.0.0',
    apiBaseUrl: 'http://localhost:4000',
    availabilityEnabled: false,
    trailersEnabled: false,
    recommendationsEnabled: true,
  }),
  getApiBaseUrl: () => 'http://localhost:4000',
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

const resetSavedLibrary = (watchlist = [savedEntry()]) => {
  window.localStorage.setItem(
    SAVED_LIBRARY_STORAGE_KEY,
    JSON.stringify(savedEnvelope({ watchlist, favorites: [savedTvEntry()] }))
  )
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
}

beforeEach(() => {
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
  window.localStorage.clear()
  resetSavedLibrary()
})

describe('RecommendationArea local exclusions', () => {
  it('hides saved titles locally without changing the request or the saved membership', async () => {
    await renderWithProviders(<HomePage />)

    const list = await screen.findByRole('list', { name: 'Popular titles' })
    expect(list).not.toHaveTextContent('Fight Club')
    expect(list).toHaveTextContent('Arrival')

    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 1,
    })
    expect(vi.mocked(fetchSectionPage).mock.calls.every(([request]) => request.page === 1)).toBe(
      true
    )

    const snapshot = getSavedLibraryStore().getSnapshot()
    expect(snapshot.counts.watchlist).toBe(1)
    expect(snapshot.counts.favorites).toBe(1)
    expect(snapshot.watchlist.map((entry) => entry.itemId)).toContain(movieItem().id)
    expect(window.localStorage.getItem(SAVED_LIBRARY_STORAGE_KEY)).toContain(movieItem().id)
  })

  it('makes a title eligible again when it is removed from the saved collection', async () => {
    await renderWithProviders(<HomePage />)
    const list = await screen.findByRole('list', { name: 'Popular titles' })
    expect(list).not.toHaveTextContent('Fight Club')
    const requestsBeforeRemoval = vi.mocked(fetchSectionPage).mock.calls.length

    await act(async () => {
      getSavedLibraryStore().remove('watchlist', { mediaType: 'movie', itemId: movieItem().id })
    })

    expect(
      await screen.findByRole('link', { name: /Fight Club, Movies, 1999/ })
    ).toBeInTheDocument()
    expect(vi.mocked(fetchSectionPage).mock.calls.length).toBe(requestsBeforeRemoval)
    expect(getSavedLibraryStore().getSnapshot().counts.watchlist).toBe(0)
    expect(getSavedLibraryStore().getSnapshot().counts.favorites).toBe(1)
  })
})
