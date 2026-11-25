import { screen, waitFor } from '@testing-library/react'
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

const catalogClient = await import('@/entities/catalog/api/catalogClient')
const { fetchSectionPage } = catalogClient

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockResolvedValue(
    pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
  )
  window.localStorage.clear()
})

describe('RecommendationArea guest privacy', () => {
  it('sends only the provider list request and writes no recommendation storage', async () => {
    window.localStorage.setItem(
      SAVED_LIBRARY_STORAGE_KEY,
      JSON.stringify(savedEnvelope({ watchlist: [savedEntry()], favorites: [savedTvEntry()] }))
    )
    window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
    const writes: string[] = []
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      writes.push(key)
    })

    await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    await waitFor(() => expect(fetchSectionPage).toHaveBeenCalledTimes(1))

    const request = vi.mocked(fetchSectionPage).mock.calls[0]?.[0]
    expect(request).toEqual({
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 1,
    })
    expect(Object.keys(request ?? {})).toHaveLength(4)
    const serializedRequest = JSON.stringify(request)
    expect(serializedRequest).not.toContain('Fight Club')
    expect(serializedRequest).not.toContain(movieItem().id)
    expect(serializedRequest).not.toContain(savedEntry().title)
    expect(serializedRequest).not.toContain('account')
    expect(serializedRequest).not.toContain('session')

    expect(vi.mocked(catalogClient.fetchItem)).not.toHaveBeenCalled()
    expect(vi.mocked(catalogClient.fetchCapabilities)).not.toHaveBeenCalled()
    expect(vi.mocked(catalogClient.fetchSearchPage)).not.toHaveBeenCalled()

    expect(writes).toEqual([])
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index)
    )
    expect(keys).toEqual([SAVED_LIBRARY_STORAGE_KEY])
    setItemSpy.mockRestore()

    const snapshot = getSavedLibraryStore().getSnapshot()
    expect(snapshot.counts).toEqual({ watchlist: 1, favorites: 1 })
  })
})
