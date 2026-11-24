import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
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

const createStore = (
  watchlist: readonly SavedEntry[] = [],
  favorites: readonly SavedEntry[] = []
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

const renderPage = (store: ReturnType<typeof createStore>, path = '/saved/watchlist') =>
  renderWithProviders(<SavedPage store={store} />, { initialEntries: [path] })

describe('SavedPage', () => {
  it('renders the populated watchlist', async () => {
    await renderPage(createStore([savedEntry()]))

    expect(await screen.findByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
    expect(screen.getByText('1 title')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
  })

  it('renders the favorites collection independently', async () => {
    const favorites = [savedEntry(), savedEntry({ itemId: 'movie-002', title: 'Arrival' })]
    await renderPage(createStore([], favorites), '/saved/favorites')

    expect(await screen.findByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument()
    expect(screen.getByText('2 titles')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Arrival' })).toBeInTheDocument()
  })

  it('shows the empty state for an empty collection', async () => {
    await renderPage(createStore())

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your watchlist is empty' })
    ).toBeInTheDocument()
  })

  it('restores entries after a remount', async () => {
    const store = createStore([savedEntry()])
    const first = await renderPage(store)
    await screen.findByRole('link', { name: 'Fight Club' })

    first.unmount()
    await renderPage(store)

    expect(await screen.findByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
  })

  it('updates the view when an entry is removed', async () => {
    const user = userEvent.setup()
    await renderPage(createStore([savedEntry()]))
    await screen.findByRole('link', { name: 'Fight Club' })

    await user.click(screen.getByRole('button', { name: 'Remove Fight Club' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your watchlist is empty' })
    ).toBeInTheDocument()
  })

  it('moves focus to the next removal action after a removal', async () => {
    const user = userEvent.setup()
    const entries = makeEntries(3)
    await renderPage(createStore(entries))

    const removeButtons = await screen.findAllByRole('button', { name: /Remove Title/ })
    await user.click(removeButtons[0] as HTMLElement)

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Remove Title 2' })).toHaveFocus()
  })

  it('moves focus to the collection heading when the last entry is removed', async () => {
    const user = userEvent.setup()
    await renderPage(createStore([savedEntry()]))
    await screen.findByRole('link', { name: 'Fight Club' })

    await user.click(screen.getByRole('button', { name: 'Remove Fight Club' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'Watchlist' })
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('keeps a 200-entry collection operable through batches', async () => {
    const user = userEvent.setup()
    await renderPage(createStore(makeEntries(200)))

    expect(await screen.findAllByRole('listitem')).toHaveLength(50)

    await user.click(screen.getByRole('button', { name: 'Show more' }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(100))

    await user.click(screen.getByRole('button', { name: 'Show more' }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(150))

    await user.click(screen.getByRole('button', { name: 'Show more' }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(200))
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  }, 30000)
})
