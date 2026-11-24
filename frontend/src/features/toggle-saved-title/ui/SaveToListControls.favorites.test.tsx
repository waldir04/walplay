import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type {
  SavedEntry,
  SavedLibrarySnapshot,
  SavedLibraryStore,
  SavedMutationOutcome,
} from '@/entities/saved-library'
import { createSavedLibraryStore } from '@/entities/saved-library'
import { SAVED_AT, savedEntry, savedSnapshot } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SaveToListControls } from './SaveToListControls'

const createStorage = () => {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
}

const createStubStore = (
  outcome: SavedMutationOutcome,
  initial: readonly SavedEntry[] = []
): SavedLibraryStore => {
  const snapshot: SavedLibrarySnapshot = {
    status: initial.length === 0 ? 'empty' : 'ready',
    watchlist: [],
    favorites: initial,
    counts: { watchlist: 0, favorites: initial.length },
    mutationError: null,
    recoveryReason: null,
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    add: () => ({ outcome }),
    remove: () => ({ outcome }),
    toggle: () => ({ outcome }),
    clearCollection: () => ({ outcome: 'cleared' }),
    clearAll: () => ({ outcome: 'cleared' }),
    resetUnreadable: () => ({ outcome: 'reset' }),
    reload: () => undefined,
    dispose: () => undefined,
  }
}

const renderFavorites = (
  store: SavedLibraryStore = createSavedLibraryStore({
    storage: createStorage(),
    now: () => SAVED_AT,
  })
) =>
  renderWithProviders(
    <SaveToListControls
      collection="favorites"
      title="Fight Club"
      snapshot={savedSnapshot()}
      store={store}
    />
  )

describe('SaveToListControls favorites', () => {
  it('uses favorites-specific labels and accessible names', async () => {
    await renderFavorites()

    const button = screen.getByRole('button', { name: 'Add Fight Club to favorites' })
    expect(button).toHaveTextContent('Add to favorites')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Add to watchlist')).toBeNull()
  })

  it('adds a favorite', async () => {
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderFavorites(store)

    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to favorites' }))

    expect(await screen.findByText('Fight Club added to favorites.')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Fight Club from favorites' })
      ).toBeInTheDocument()
    )
  })

  it('removes a favorite', async () => {
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderFavorites(store)
    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to favorites' }))
    await waitFor(() => expect(store.getSnapshot().counts.favorites).toBe(1))

    fireEvent.click(screen.getByRole('button', { name: 'Remove Fight Club from favorites' }))

    expect(await screen.findByText('Fight Club removed from favorites.')).toBeInTheDocument()
  })

  it('announces an already-favorite duplicate', async () => {
    await renderFavorites(createStubStore('already-present'))

    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to favorites' }))

    expect(await screen.findByText('Fight Club is already in favorites.')).toBeInTheDocument()
  })

  it('reflects saved favorites as pressed', async () => {
    await renderFavorites(createStubStore('removed', [savedEntry()]))

    expect(
      screen.getByRole('button', { name: 'Remove Fight Club from favorites' })
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
