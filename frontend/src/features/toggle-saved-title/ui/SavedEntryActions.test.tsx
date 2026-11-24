import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedEntryActions } from './SavedEntryActions'

const createStorage = (initial: string | null = null) => {
  let value = initial
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  return storage
}

const createSeededStore = (
  watchlist: readonly SavedEntry[] = [],
  favorites: readonly SavedEntry[] = []
) =>
  createSavedLibraryStore({
    storage: createStorage(
      JSON.stringify(savedEnvelope({ watchlist: [...watchlist], favorites: [...favorites] }))
    ),
    now: () => SAVED_AT,
  })

const renderActions = (
  options: {
    readonly collection?: 'watchlist' | 'favorites'
    readonly watchlist?: readonly SavedEntry[]
    readonly favorites?: readonly SavedEntry[]
    readonly onAnnounce?: (message: string) => void
  } = {}
) => {
  const store = createSeededStore(options.watchlist, options.favorites)
  renderWithProviders(
    <SavedEntryActions
      collection={options.collection ?? 'watchlist'}
      entry={savedEntry()}
      store={store}
      onAnnounce={options.onAnnounce}
    />
  )
  return store
}

describe('SavedEntryActions', () => {
  it('removes the entry from the current collection', async () => {
    const store = renderActions({ watchlist: [savedEntry()] })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Fight Club' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Fight Club' }))

    expect(await screen.findByText('Fight Club removed from your watchlist.')).toBeInTheDocument()
    await waitFor(() => expect(store.getSnapshot().counts.watchlist).toBe(0))
  })

  it('adds the entry to the other collection with a target-named label', async () => {
    const store = renderActions({ watchlist: [savedEntry()] })

    const addToFavorites = await screen.findByRole('button', {
      name: 'Add Fight Club to favorites',
    })
    fireEvent.click(addToFavorites)

    expect(await screen.findByText('Fight Club added to favorites.')).toBeInTheDocument()
    await waitFor(() => expect(store.getSnapshot().counts.favorites).toBe(1))
  })

  it('offers removal from the other collection when it is already there', async () => {
    renderActions({ watchlist: [savedEntry()], favorites: [savedEntry()] })

    expect(
      await screen.findByRole('button', { name: 'Remove Fight Club from favorites' })
    ).toBeInTheDocument()
  })

  it('announces a single-entry removal once without a confirmation step', async () => {
    const onAnnounce = vi.fn()
    renderActions({ watchlist: [savedEntry()], onAnnounce })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Fight Club' })).toBeInTheDocument()
    )

    expect(screen.queryByText(/confirm/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fight Club' }))

    await waitFor(() => expect(onAnnounce).toHaveBeenCalledTimes(1))
    expect(onAnnounce).toHaveBeenCalledWith('Fight Club removed from your watchlist.')
  })
})
