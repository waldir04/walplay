import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedCollectionSection } from './SavedCollectionSection'
import { SavedStorageNotice } from './SavedStorageNotice'

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

const DESCRIPTION =
  'Saved titles stay in this browser on this device. They can be lost if you clear browsing data, use private browsing, or change browser or device. They are not synchronized across devices.'

describe('SavedStorageNotice', () => {
  it('states the exact device-only limitation as text', async () => {
    await renderWithProviders(<SavedStorageNotice />)

    expect(screen.getByRole('heading', { name: 'Saved on this device only' })).toBeInTheDocument()
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument()
  })

  it('does not advertise accounts or synchronization', async () => {
    const { container } = await renderWithProviders(<SavedStorageNotice />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/sign in|log in|create an account|keep in sync|sync your/i)
  })

  it('is rendered persistently in both collections', async () => {
    const store = createStore()
    const { unmount } = await renderWithProviders(
      <SavedCollectionSection
        collection="watchlist"
        status="populated"
        entries={[savedEntry()]}
        totalCount={1}
        visibleCount={1}
        onShowMore={vi.fn()}
        store={store}
      />
    )
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument()
    unmount()

    await renderWithProviders(
      <SavedCollectionSection
        collection="favorites"
        status="empty"
        entries={[]}
        totalCount={0}
        visibleCount={0}
        onShowMore={vi.fn()}
        store={store}
      />
    )
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument()
  })
})
