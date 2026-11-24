import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedCollectionManage } from './SavedCollectionManage'

const createStore = (
  watchlist: readonly SavedEntry[] = [savedEntry()],
  favorites: readonly SavedEntry[] = [savedEntry()]
) => {
  let value: string | null = JSON.stringify(
    savedEnvelope({ watchlist: [...watchlist], favorites: [...favorites] })
  )
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  const store = createSavedLibraryStore({ storage, now: () => SAVED_AT })
  store.reload()
  return store
}

describe('SavedCollectionManage', () => {
  it('starts with delete actions and no confirmation step', async () => {
    await renderWithProviders(
      <SavedCollectionManage collection="watchlist" store={createStore()} />
    )

    expect(screen.getByRole('button', { name: 'Delete watchlist' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete all saved titles' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull()
  })

  it('requires a second step before deleting a collection', async () => {
    const user = userEvent.setup()
    const store = createStore()
    await renderWithProviders(<SavedCollectionManage collection="watchlist" store={store} />)

    await user.click(screen.getByRole('button', { name: 'Delete watchlist' }))
    expect(store.getSnapshot().counts.watchlist).toBe(1)
    expect(screen.getByRole('button', { name: 'Confirm delete watchlist' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm delete watchlist' }))

    await waitFor(() => expect(store.getSnapshot().counts.watchlist).toBe(0))
    expect(store.getSnapshot().counts.favorites).toBe(1)
    expect(
      await screen.findByText('Your watchlist was deleted from this device.')
    ).toBeInTheDocument()
  })

  it('cancels the confirmation without deleting', async () => {
    const user = userEvent.setup()
    const store = createStore()
    await renderWithProviders(<SavedCollectionManage collection="favorites" store={store} />)

    await user.click(screen.getByRole('button', { name: 'Delete favorites' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(store.getSnapshot().counts.favorites).toBe(1)
    expect(screen.getByRole('button', { name: 'Delete favorites' })).toBeInTheDocument()
  })

  it('deletes all saved titles after confirmation', async () => {
    const user = userEvent.setup()
    const store = createStore()
    await renderWithProviders(<SavedCollectionManage collection="watchlist" store={store} />)

    await user.click(screen.getByRole('button', { name: 'Delete all saved titles' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete all saved titles' }))

    await waitFor(() => expect(store.getSnapshot().status).toBe('empty'))
    expect(
      await screen.findByText('All saved titles were deleted from this device.')
    ).toBeInTheDocument()
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    const store = createStore()
    await renderWithProviders(<SavedCollectionManage collection="watchlist" store={store} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Delete watchlist' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Confirm delete watchlist' })).toBeInTheDocument()
  })
})
