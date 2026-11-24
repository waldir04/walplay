import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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
    watchlist: initial,
    favorites: [],
    counts: { watchlist: initial.length, favorites: 0 },
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

const renderControl = (
  store: SavedLibraryStore = createSavedLibraryStore({
    storage: createStorage(),
    now: () => SAVED_AT,
  })
) =>
  renderWithProviders(
    <SaveToListControls
      collection="watchlist"
      title="Fight Club"
      snapshot={savedSnapshot()}
      store={store}
    />
  )

describe('SaveToListControls watchlist', () => {
  it('renders a watchlist-specific visible label and accessible name', async () => {
    await renderControl()

    const button = screen.getByRole('button', { name: 'Add Fight Club to watchlist' })
    expect(button).toHaveTextContent('Add to watchlist')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('reflects stored membership as pressed and offers removal', async () => {
    await renderControl(createStubStore('removed', [savedEntry()]))

    const button = screen.getByRole('button', { name: 'Remove Fight Club from watchlist' })
    expect(button).toHaveTextContent('Remove from watchlist')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('exposes the device-only hint before and after a save', async () => {
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderControl(store)

    expect(screen.getByText('Saved titles stay on this device only.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to watchlist' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Fight Club from watchlist' })
      ).toBeInTheDocument()
    )
    expect(screen.getByText('Saved titles stay on this device only.')).toBeInTheDocument()
  })

  it('shows a pending busy state before announcing a save', async () => {
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderControl(store)

    const button = screen.getByRole('button', { name: 'Add Fight Club to watchlist' })
    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('Fight Club added to your watchlist.')).toBeInTheDocument()
  })

  it('announces a failure without claiming success', async () => {
    await renderControl(createStubStore('write-failed'))

    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to watchlist' }))

    expect(
      await screen.findByText('Fight Club could not be saved on this device. Try again.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Fight Club to watchlist' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderControl(store)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Add Fight Club to watchlist' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(await screen.findByText('Fight Club added to your watchlist.')).toBeInTheDocument()
  })

  it('does not call the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    await renderControl(store)

    fireEvent.click(screen.getByRole('button', { name: 'Add Fight Club to watchlist' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Fight Club from watchlist' })
      ).toBeInTheDocument()
    )

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
