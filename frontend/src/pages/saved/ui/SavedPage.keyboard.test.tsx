import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { CatalogApiError } from '@/shared/api/httpClient'
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

const createStore = (entries: readonly SavedEntry[]) => {
  let value: string | null = JSON.stringify(savedEnvelope({ watchlist: [...entries] }))
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

const makeEntries = (count: number): SavedEntry[] =>
  Array.from({ length: count }, (_value, index) =>
    savedEntry({
      itemId: `movie-${String(index).padStart(3, '0')}`,
      title: `Title ${String(index + 1)}`,
      savedAt: new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString(),
    })
  )

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
})

const renderPage = (entries: readonly SavedEntry[]) =>
  renderWithProviders(<SavedPage store={createStore(entries)} />, {
    initialEntries: ['/saved/watchlist'],
  })

describe('SavedPage keyboard and announcements', () => {
  it('keeps row actions in list order and visibly focusable', async () => {
    await renderPage(makeEntries(3))
    const removeButtons = await screen.findAllByRole('button', { name: /Remove Title/ })

    expect(removeButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove Title 3',
      'Remove Title 2',
      'Remove Title 1',
    ])
    expect(removeButtons[0]?.className).toContain('focus-visible:outline-2')

    removeButtons[0]?.focus()
    expect(removeButtons[0]).toHaveFocus()
  })

  it('does not trap focus', async () => {
    const user = userEvent.setup()
    await renderPage(makeEntries(2))
    await screen.findAllByRole('button', { name: /Remove Title/ })

    await user.tab()
    const first = document.activeElement
    await user.tab()
    const second = document.activeElement
    await user.tab()

    expect(first).not.toBeNull()
    expect(second).not.toBe(first)
    expect(document.activeElement).not.toBe(second)
  })

  it('announces Show more once', async () => {
    const user = userEvent.setup()
    await renderPage(makeEntries(51))

    await user.click(await screen.findByRole('button', { name: 'Show more' }))

    expect(screen.getAllByText('Showing 1–51 of 51')).toHaveLength(1)
  })

  it('announces a removal once', async () => {
    const user = userEvent.setup()
    await renderPage(makeEntries(2))
    await screen.findAllByRole('button', { name: /Remove Title/ })

    await user.click(screen.getByRole('button', { name: 'Remove Title 1' }))

    await waitFor(() =>
      expect(screen.getAllByText('Title 1 removed from your watchlist.')).toHaveLength(1)
    )
  })

  it('announces clearing all saved titles once', async () => {
    const user = userEvent.setup()
    await renderPage(makeEntries(2))

    await user.click(await screen.findByRole('button', { name: 'Delete all saved titles' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete all saved titles' }))

    await waitFor(() =>
      expect(screen.getAllByText('All saved titles were deleted from this device.')).toHaveLength(1)
    )
  })
})
