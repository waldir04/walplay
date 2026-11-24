import { screen } from '@testing-library/react'
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

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
})

describe('SavedPage responsive contract', () => {
  it('uses fluid layouts with no fixed widths or horizontal overflow', async () => {
    const { container } = await renderWithProviders(
      <SavedPage store={createStore([savedEntry()])} />,
      { initialEntries: ['/saved/watchlist'] }
    )
    const root = container.firstElementChild as HTMLElement
    await screen.findByRole('link', { name: 'Fight Club' })

    expect(root.className).toContain('flex-col')
    expect(root.className).not.toMatch(/w-\[\d+px\]/)
    expect(root.className).not.toMatch(/overflow-x-(auto|scroll)/)
    expect(document.querySelectorAll('[class*="w-["]')).toHaveLength(0)
  })

  it('keeps primary targets at 44 px and secondary targets at 24 px or more', async () => {
    await renderWithProviders(<SavedPage store={createStore([savedEntry()])} />, {
      initialEntries: ['/saved/watchlist'],
    })
    await screen.findByRole('link', { name: 'Fight Club' })

    const remove = screen.getByRole('button', { name: 'Remove Fight Club' })
    expect(remove.className).toContain('min-h-11')

    const other = screen.getByRole('button', { name: 'Add Fight Club to favorites' })
    expect(other.className).toMatch(/min-h-(9|11)/)

    const navLink = screen.getByRole('link', { name: 'Watchlist' })
    expect(navLink.className).toContain('min-h-11')
  })

  it('allows long headings to wrap without clipping', async () => {
    await renderWithProviders(<SavedPage store={createStore([savedEntry()])} />, {
      initialEntries: ['/saved/watchlist'],
    })
    const heading = await screen.findByRole('heading', { level: 3 })
    expect(heading.className).toContain('break-words')
    expect(heading.className).not.toContain('truncate')
  })
})
