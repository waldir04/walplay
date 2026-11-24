import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY } from '@/entities/saved-library'
import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedEventTarget, SavedStorage } from '@/entities/saved-library'
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

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new Error('catalog unavailable in test'))
})

const createCrossTabHarness = () => {
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
  const listeners = new Set<(event: { readonly key: string | null }) => void>()
  const eventTarget: SavedEventTarget = {
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
  }
  const store = createSavedLibraryStore({ storage, eventTarget, now: () => SAVED_AT })

  return {
    store,
    foreignWrite: (entries: readonly SavedEntry[]) => {
      value = JSON.stringify(savedEnvelope({ watchlist: [...entries] }))
      listeners.forEach((listener) => listener({ key: SAVED_LIBRARY_STORAGE_KEY }))
    },
  }
}

describe('SavedPage cross-tab refresh', () => {
  it('reflects a foreign-tab change without a manual reload and loses no entry', async () => {
    const harness = createCrossTabHarness()
    await renderWithProviders(<SavedPage store={harness.store} />, {
      initialEntries: ['/saved/watchlist'],
    })

    expect(await screen.findByRole('link', { name: 'Fight Club' })).toBeInTheDocument()

    const second = savedEntry({
      itemId: 'd2wxOm1vdmllOjY4MA',
      title: 'Arrival',
      savedAt: '2026-11-24T16:00:00.000Z',
    })

    act(() => {
      harness.foreignWrite([second, savedEntry()])
    })

    expect(await screen.findByRole('link', { name: 'Arrival' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
    expect(screen.getByText('2 titles')).toBeInTheDocument()
  })
})
