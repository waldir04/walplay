import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { CatalogItem } from '@/entities/catalog'
import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, providerMeta } from '@/test/fixtures/catalog'
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

const createStore = (watchlist = [savedEntry()]) => {
  let value: string | null = JSON.stringify(savedEnvelope({ watchlist }))
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  return createSavedLibraryStore({ storage, now: () => SAVED_AT })
}

const itemBody = (item: CatalogItem) => ({ data: item, meta: providerMeta() })

const renderPage = (store: ReturnType<typeof createStore>) =>
  renderWithProviders(<SavedPage store={store} />, { initialEntries: ['/saved/watchlist'] })

const makeEntries = (count: number) =>
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

describe('SavedPage catalog hydration', () => {
  it('replaces the stored snapshot with current catalog information', async () => {
    vi.mocked(fetchItem).mockResolvedValue(itemBody(movieItem()))
    await renderPage(createStore([savedEntry({ title: 'Old title' })]))

    expect(await screen.findByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.queryByText('Old title')).toBeNull()
  })

  it('keeps a deleted title counted and removable', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    const store = createStore([savedEntry()])
    await renderPage(store)

    expect(await screen.findByText('No longer available in the catalog.')).toBeInTheDocument()
    expect(screen.getByText('1 title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Fight Club' })).toBeInTheDocument()
    expect(store.getSnapshot().counts.watchlist).toBe(1)
  })

  it('does not treat a temporary failure as deleted', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
    const store = createStore([savedEntry()])
    await renderPage(store)

    expect(await screen.findByText('Details are temporarily unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('No longer available in the catalog.')).toBeNull()
    expect(store.getSnapshot().counts.watchlist).toBe(1)
  })

  it('recovers after retrying the details', async () => {
    vi.mocked(fetchItem)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_TIMEOUT', 504))
      .mockResolvedValue(itemBody(movieItem()))
    await renderPage(createStore([savedEntry()]))

    const retry = await screen.findByRole('button', { name: 'Retry details' })
    await userEvent.setup().click(retry)

    expect(await screen.findByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
  })

  it('queries only the visible batch', async () => {
    vi.mocked(fetchItem).mockImplementation(({ mediaType, itemId }) =>
      Promise.resolve(itemBody(movieItem({ id: itemId, mediaType })))
    )
    const store = createStore(makeEntries(60))
    await renderPage(store)

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(50))
    await waitFor(() => expect(vi.mocked(fetchItem).mock.calls.length).toBe(50))

    await userEvent.setup().click(screen.getByRole('button', { name: 'Show more' }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(60))
    await waitFor(() => expect(vi.mocked(fetchItem).mock.calls.length).toBe(60))
  })
})
