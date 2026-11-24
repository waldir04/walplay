import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { i18n } from '@/app/i18n'
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

const entries = [
  savedEntry(),
  savedEntry({ itemId: 'movie-002', title: 'Arrival', savedAt: '2026-11-24T14:00:00.000Z' }),
]

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
})

const renderPage = (store = createStore(entries)) =>
  renderWithProviders(<SavedPage store={store} />, {
    locale: 'es',
    initialEntries: ['/saved/watchlist'],
  })

describe('SavedPage Spanish', () => {
  it('renders localized collection copy, plural counts, and dates', async () => {
    await renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lista para ver' })
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Colecciones guardadas' })).toBeInTheDocument()
    expect(screen.getByText('2 títulos')).toBeInTheDocument()
    expect(screen.getAllByText('Guardado el 24 de noviembre de 2026')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Fight Club' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/saved\.(title|description|empty|entry|count)/)
  })

  it('uses the singular plural form for one title', async () => {
    await renderPage(createStore([savedEntry()]))

    expect(await screen.findByText('1 título')).toBeInTheDocument()
  })

  it('keeps membership, order, and counts when the language changes', async () => {
    const store = createStore(entries)
    await renderPage(store)
    await screen.findByText('2 títulos')
    const before = store.getSnapshot()

    await act(async () => {
      await i18n.changeLanguage('en')
    })
    expect(screen.getByText('2 titles')).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['Fight Club', 'Arrival'])
    expect(store.getSnapshot().counts).toEqual(before.counts)
    expect(store.getSnapshot().watchlist).toEqual(before.watchlist)
  })
})
