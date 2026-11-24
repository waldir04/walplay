import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedEntry, SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedEntryList } from './SavedEntryList'

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

const makeEntries = (count: number): SavedEntry[] =>
  Array.from({ length: count }, (_value, index) =>
    savedEntry({
      itemId: `movie-${String(index).padStart(3, '0')}`,
      title: `Title ${String(index + 1)}`,
      savedAt: new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString(),
    })
  )

interface RenderListOptions {
  readonly total: number
  readonly visibleCount?: number
  readonly onShowMore?: () => void
}

const renderList = ({ total, visibleCount = 50, onShowMore = vi.fn() }: RenderListOptions) => {
  const entries = makeEntries(total).slice(0, visibleCount)
  renderWithProviders(
    <SavedEntryList
      entries={entries}
      collection="watchlist"
      totalCount={total}
      visibleCount={visibleCount}
      onShowMore={onShowMore}
      store={createStore()}
    />
  )
  return { onShowMore, entries }
}

describe('SavedEntryList', () => {
  it('renders one batch of 50 without a Show more control', async () => {
    renderList({ total: 50 })

    expect(await screen.findAllByRole('listitem')).toHaveLength(50)
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('offers Show more for a 51-entry collection', async () => {
    const { onShowMore } = renderList({ total: 51 })
    const button = await screen.findByRole('button', { name: 'Show more' })

    fireEvent.click(button)
    expect(onShowMore).toHaveBeenCalledTimes(1)
  })

  it('announces the revealed range once and keeps focus on the button', async () => {
    const user = userEvent.setup()
    renderList({ total: 120 })
    const button = await screen.findByRole('button', { name: 'Show more' })

    await user.click(button)

    expect(button).toHaveFocus()
    expect(await screen.findByText('Showing 1–100 of 120')).toBeInTheDocument()
  })

  it('preserves deterministic order and list semantics', async () => {
    const { entries } = renderList({ total: 10, visibleCount: 10 })

    const list = await screen.findByRole('list', { name: 'Watchlist titles' })
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((heading) => heading.textContent)).toEqual(
      entries.map((entry) => entry.title)
    )
    expect(list).toBeInTheDocument()
  })

  it('does not render numbered pagination', async () => {
    renderList({ total: 120 })
    await screen.findByRole('button', { name: 'Show more' })

    expect(screen.queryByRole('button', { name: /page \d/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /page \d/i })).toBeNull()
  })
})
