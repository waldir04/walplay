import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogCard } from '@/entities/catalog'
import { createSavedLibraryStore, SAVED_COLLECTIONS } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedPage } from './SavedPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
  fetchSectionPage: vi.fn(),
}))

const { fetchItem } = await import('@/entities/catalog/api/catalogClient')

const createStore = () => {
  let value: string | null = JSON.stringify(savedEnvelope({ watchlist: [savedEntry()] }))
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  return createSavedLibraryStore({ storage, now: () => SAVED_AT })
}

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
})

describe('SavedPage scope guard', () => {
  it('renders exactly two collections with no user-created lists', async () => {
    await renderWithProviders(<SavedPage store={createStore()} />, {
      initialEntries: ['/saved/watchlist'],
    })
    await screen.findByRole('link', { name: 'Fight Club' })

    expect(SAVED_COLLECTIONS).toEqual(['watchlist', 'favorites'])
    const nav = screen.getByRole('navigation', { name: 'Saved collections' })
    expect(nav.querySelectorAll('a')).toHaveLength(2)
    expect(document.body.textContent).not.toMatch(/new list|create list|custom collection/i)
  })

  it('advertises no account, sync, availability, or playback promise', async () => {
    await renderWithProviders(<SavedPage store={createStore()} />, {
      initialEntries: ['/saved/watchlist'],
    })
    await screen.findByRole('link', { name: 'Fight Club' })

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/sign in|log in|create an account|keep .*in sync|sync your/i)
    expect(text).not.toMatch(/where to watch|streaming|availability|playback/i)
  })

  it('renders no social, notification, recommendation, watched, rating, note, or subscription surfaces', async () => {
    await renderWithProviders(<SavedPage store={createStore()} />, {
      initialEntries: ['/saved/watchlist'],
    })
    await screen.findByRole('link', { name: 'Fight Club' })

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/share|notification|recommend|watched|rating|notes?|subscribe/i)
    expect(screen.queryByRole('button', { name: /share|play|subscribe|notify/i })).toBeNull()
  })

  it('does not add save controls to catalog cards', async () => {
    await renderWithProviders(<CatalogCard item={movieItem()} />)

    expect(screen.queryByRole('button', { name: /watchlist|favorite/i })).toBeNull()
  })
})
