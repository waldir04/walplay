import { describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import { savedEntry } from '@/test/fixtures/saved'

import { savedEntryView } from './savedEntryView'
import type { SavedEntryHydrationResult } from './savedEntryView'

const hydration = (
  overrides: Partial<SavedEntryHydrationResult> = {}
): SavedEntryHydrationResult => ({
  identity: `movie:${MOVIE_ID}`,
  status: 'pending',
  retry: vi.fn(),
  ...overrides,
})

describe('savedEntryView', () => {
  it('maps a pending query to refreshing', () => {
    expect(savedEntryView(savedEntry(), hydration()).state).toBe('refreshing')
  })

  it('maps a successful query to hydrated with current data', () => {
    const view = savedEntryView(
      savedEntry({ title: 'Old title' }),
      hydration({ status: 'success', item: movieItem() })
    )

    expect(view.state).toBe('hydrated')
    expect(view.item?.title).toBe('Fight Club')
  })

  it('maps a not-found error to not-in-catalog', () => {
    const view = savedEntryView(
      savedEntry(),
      hydration({ status: 'error', error: new CatalogApiError('CATALOG_NOT_FOUND', 404) })
    )

    expect(view.state).toBe('not-in-catalog')
  })

  it('maps other errors to temporarily unavailable with retry', () => {
    const retry = vi.fn()
    const view = savedEntryView(
      savedEntry(),
      hydration({ status: 'error', error: new CatalogApiError('CATALOG_TIMEOUT', 504), retry })
    )

    expect(view.state).toBe('temporarily-unavailable')
    expect(view.retry).toBe(retry)
  })

  it('maps an unusable identity to unreadable without querying', () => {
    const view = savedEntryView(
      savedEntry({ itemId: 'short' }),
      hydration({ status: 'error', error: new CatalogApiError('CATALOG_NOT_FOUND', 404) })
    )

    expect(view.state).toBe('unreadable')
  })

  it('returns to hydrated when a retry resolves', () => {
    const entry = savedEntry()
    const errored = savedEntryView(
      entry,
      hydration({ status: 'error', error: new CatalogApiError('CATALOG_TIMEOUT', 504) })
    )
    const restored = savedEntryView(entry, hydration({ status: 'success', item: movieItem() }))

    expect(errored.state).toBe('temporarily-unavailable')
    expect(restored.state).toBe('hydrated')
  })
})
