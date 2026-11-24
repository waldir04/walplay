import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { movieItem } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import type { SavedEntryView } from '../model/savedEntryView'
import { SavedEntryCard } from './SavedEntryCard'

const createStore = (entry = savedEntry()) => {
  let value: string | null = JSON.stringify(savedEnvelope({ watchlist: [entry] }))
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

const renderCard = async (view: SavedEntryView, store = createStore(view.entry)) => {
  const result = await renderWithProviders(
    <SavedEntryCard entry={view.entry} collection="watchlist" view={view} store={store} />
  )
  return { ...result, store }
}

describe('SavedEntryCard degraded states', () => {
  it('shows the snapshot with a retry for a temporarily unavailable title', async () => {
    const retry = vi.fn()
    await renderCard({ entry: savedEntry(), state: 'temporarily-unavailable', retry })

    expect(screen.getByText('Details are temporarily unavailable.')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Retry details' })
    await userEvent.setup().click(button)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('marks a deleted title and keeps it removable', async () => {
    const entry = savedEntry()
    const { store } = await renderCard({ entry, state: 'not-in-catalog' })

    expect(screen.getByText('No longer available in the catalog.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Fight Club' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Fight Club' })).toBeNull()
    expect(store.getSnapshot().counts.watchlist).toBe(1)
  })

  it('renders an unreadable entry with removal only', async () => {
    const entry = savedEntry({ itemId: 'short', title: 'Broken entry' })
    await renderCard({ entry, state: 'unreadable' })

    expect(screen.getByText("This saved title can't be read.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Broken entry' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /favorites/i })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Broken entry' })).toBeNull()
  })

  it('uses current catalog data when it has been renamed', async () => {
    await renderCard({
      entry: savedEntry({ title: 'Old title' }),
      state: 'hydrated',
      item: movieItem(),
    })

    expect(screen.getByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.queryByText('Old title')).toBeNull()
  })

  it('never removes a degraded entry silently', async () => {
    const entry = savedEntry()
    const { store } = await renderCard({
      entry,
      state: 'temporarily-unavailable',
      retry: vi.fn(),
    })

    expect(screen.getByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
    expect(store.getSnapshot().counts.watchlist).toBe(1)
  })
})
