import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedEntryCard } from './SavedEntryCard'

const LONG_TITLE =
  '千と千尋の神隠しと非常に長いタイトルのテスト — A Very Long Title That Must Remain Fully Available'

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

describe('SavedEntryCard long titles', () => {
  it('exposes the full title to assistive technology without clipping it', async () => {
    await renderWithProviders(
      <SavedEntryCard
        entry={savedEntry({ title: LONG_TITLE })}
        collection="watchlist"
        store={createStore()}
      />
    )

    const link = screen.getByRole('link', { name: LONG_TITLE })
    expect(link).toHaveTextContent(LONG_TITLE)
    expect(link.className).not.toContain('truncate')
    expect(link.parentElement?.className).toContain('break-words')

    expect(screen.getByRole('button', { name: `Remove ${LONG_TITLE}` })).toBeInTheDocument()
  })
})
