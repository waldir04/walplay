import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedCollectionSection } from './SavedCollectionSection'
import type { SavedSectionStatus } from './SavedCollectionSection'

const createStore = () => {
  let value: string | null = JSON.stringify(savedEnvelope())
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

interface RenderSectionOptions {
  readonly collection?: 'watchlist' | 'favorites'
  readonly status?: SavedSectionStatus
  readonly entries?: readonly SavedEntry[]
  readonly onShowMore?: () => void
  readonly onRetry?: () => void
}

const renderSection = ({
  collection = 'watchlist',
  status = 'populated',
  entries = [savedEntry()],
  onShowMore = vi.fn(),
  onRetry,
}: RenderSectionOptions = {}) =>
  renderWithProviders(
    <SavedCollectionSection
      collection={collection}
      status={status}
      entries={entries}
      totalCount={entries.length}
      visibleCount={entries.length}
      onShowMore={onShowMore}
      onRetry={onRetry}
      store={createStore()}
    />
  )

describe('SavedCollectionSection', () => {
  it('renders a collection-specific heading and localized count', async () => {
    const entries = [savedEntry(), savedEntry({ itemId: 'movie-002', title: 'Arrival' })]
    await renderSection({ entries })

    expect(screen.getByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
    expect(screen.getByText('2 titles')).toBeInTheDocument()
  })

  it('exposes a busy skeleton state', async () => {
    await renderSection({ status: 'loading' })

    const status = screen.getByRole('status', { name: 'Saved titles are loading' })
    expect(status).toHaveAttribute('aria-busy', 'true')
  })

  it('renders watchlist-specific empty copy with a working discovery action', async () => {
    await renderSection({ status: 'empty', entries: [] })

    expect(
      screen.getByRole('heading', { level: 2, name: 'Your watchlist is empty' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse titles' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
  })

  it('renders distinct favorites empty copy', async () => {
    await renderSection({ collection: 'favorites', status: 'empty', entries: [] })

    expect(screen.getByRole('heading', { level: 2, name: 'No favorites yet' })).toBeInTheDocument()
    expect(screen.queryByText('Your watchlist is empty')).toBeNull()
  })

  it('renders an error state distinct from the empty state', async () => {
    const onRetry = vi.fn()
    await renderSection({ status: 'error', entries: [], onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Saved titles are unavailable')
    expect(screen.queryByText('Your watchlist is empty')).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('renders both collection links with the active one current', async () => {
    await renderSection({ collection: 'favorites' })

    const nav = screen.getByRole('navigation', { name: 'Saved collections' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Watchlist' })).not.toHaveAttribute('aria-current')
  })
})
