import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { CatalogApiError } from '@/shared/api/httpClient'
import { runAxe } from '@/test/axe'
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

const createStore = (entries: readonly SavedEntry[] = []) => {
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

const criticalOrSerious = (violations: { impact?: string | null }[]): unknown[] =>
  violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious'
  )

beforeEach(() => {
  vi.mocked(fetchItem).mockReset().mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT', 504))
})

const renderPage = (store: ReturnType<typeof createStore>) =>
  renderWithProviders(<SavedPage store={store} />, { initialEntries: ['/saved/watchlist'] })

describe('SavedPage accessibility', () => {
  it('has no violations in the empty state', async () => {
    const { container } = await renderPage(createStore())
    await screen.findByRole('heading', { level: 2, name: 'Your watchlist is empty' })

    const results = await runAxe(container)
    expect(criticalOrSerious(results.violations)).toEqual([])
    expect(results).toHaveNoViolations()
  })

  it('has no violations in the populated state', async () => {
    const { container } = await renderPage(createStore([savedEntry()]))
    await screen.findByRole('link', { name: 'Fight Club' })

    const results = await runAxe(container)
    expect(criticalOrSerious(results.violations)).toEqual([])
    expect(results).toHaveNoViolations()
  })
})
