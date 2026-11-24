import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createSavedLibraryStore } from '@/entities/saved-library'
import type { SavedStorage } from '@/entities/saved-library'
import { SAVED_AT, savedEnvelope } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SavedPage } from './SavedPage'

const createCorruptStore = (raw: string) => {
  let value: string | null = raw
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  const store = createSavedLibraryStore({ storage, now: () => SAVED_AT })
  return { store, raw: () => value }
}

const renderPage = (store: ReturnType<typeof createCorruptStore>['store']) =>
  renderWithProviders(<SavedPage store={store} />, { initialEntries: ['/saved/watchlist'] })

describe('SavedPage recovery', () => {
  it('shows the recovery state for corrupt storage instead of the empty state', async () => {
    const { store } = createCorruptStore('{not json')
    await renderPage(store)

    expect(
      await screen.findByRole('heading', { name: 'Saved titles could not be read' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your watchlist is empty' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Reload page' })).toHaveAttribute(
      'href',
      '/saved/watchlist'
    )
  })

  it('preserves stored bytes until the reset is confirmed', async () => {
    const raw = '{not json'
    const harness = createCorruptStore(raw)
    await renderPage(harness.store)
    await screen.findByRole('heading', { name: 'Saved titles could not be read' })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset saved titles' }))

    expect(harness.raw()).toBe(raw)
    expect(screen.getByRole('button', { name: 'Confirm reset saved titles' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('resets after the second confirmation', async () => {
    const harness = createCorruptStore('{not json')
    await renderPage(harness.store)
    await screen.findByRole('heading', { name: 'Saved titles could not be read' })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset saved titles' }))
    await user.click(screen.getByRole('button', { name: 'Confirm reset saved titles' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your watchlist is empty' })
    ).toBeInTheDocument()
    expect(JSON.parse(harness.raw() ?? '{}')).toEqual(savedEnvelope())
  })

  it('preserves an unsupported newer version until reset', async () => {
    const raw = JSON.stringify({ version: 2, watchlist: [], favorites: [] })
    const harness = createCorruptStore(raw)
    await renderPage(harness.store)

    expect(
      await screen.findByRole('heading', { name: 'Saved titles could not be read' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your watchlist is empty' })).toBeNull()
    await waitFor(() => expect(harness.raw()).toBe(raw))
  })
})
