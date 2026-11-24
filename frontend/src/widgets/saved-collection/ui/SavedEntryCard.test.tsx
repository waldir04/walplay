import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedEntryCard } from './SavedEntryCard'

const createStore = (favorites = false) => {
  let value: string | null = JSON.stringify(
    savedEnvelope({ favorites: favorites ? [savedEntry()] : [] })
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

describe('SavedEntryCard', () => {
  it('renders the stored snapshot fields', async () => {
    const { container } = await renderWithProviders(
      <SavedEntryCard entry={savedEntry()} collection="watchlist" store={createStore()} />
    )

    const link = screen.getByRole('link', { name: 'Fight Club' })
    expect(link).toHaveAttribute('href', `/browse/movies/title/${savedEntry().itemId}`)
    expect(screen.getByText(/Movies · 1999/)).toBeInTheDocument()
    expect(screen.getByText('Saved November 24, 2026')).toBeInTheDocument()
    expect(container.querySelector('img')?.getAttribute('src')).toContain('fight-club')
  })

  it('shows membership in the other collection', async () => {
    await renderWithProviders(
      <SavedEntryCard entry={savedEntry()} collection="watchlist" store={createStore(true)} />
    )

    expect(await screen.findByText('Also in favorites')).toBeInTheDocument()
  })

  it('offers removal and the other-collection action', async () => {
    await renderWithProviders(
      <SavedEntryCard entry={savedEntry()} collection="watchlist" store={createStore()} />
    )

    expect(screen.getByRole('button', { name: 'Remove Fight Club' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Fight Club to favorites' })).toBeInTheDocument()
  })

  it('falls back to the poster placeholder when the image fails', async () => {
    const { container } = await renderWithProviders(
      <SavedEntryCard entry={savedEntry()} collection="watchlist" store={createStore()} />
    )

    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('Fight Club')
  })

  it('does not fabricate absent fields', async () => {
    const { container } = await renderWithProviders(
      <SavedEntryCard
        entry={savedEntry({ releaseYear: undefined, poster: undefined })}
        collection="watchlist"
        store={createStore()}
      />
    )

    expect(screen.getAllByText('Movies').length).toBeGreaterThan(0)
    expect(container.textContent).not.toContain('1999')
    expect(container.querySelector('img')).toBeNull()
  })
})
