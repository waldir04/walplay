import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY } from '@/entities/saved-library'
import { savedEnvelope } from '@/test/fixtures/saved'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

const seedEmpty = (): void => {
  window.localStorage.setItem(SAVED_LIBRARY_STORAGE_KEY, JSON.stringify(savedEnvelope()))
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
}

beforeEach(() => {
  installMatchMediaMock(true)
  seedEmpty()
})

describe('saved routes', () => {
  it('redirects the bare address to the watchlist', async () => {
    const { router } = renderApp(['/saved'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/saved/watchlist')
    await waitFor(() => expect(document.title).toBe('Saved · Walplay'))
  })

  it('keeps one Saved navigation entry current on both addresses', async () => {
    renderApp(['/saved/watchlist'])

    await screen.findByRole('heading', { level: 1, name: 'Watchlist' })
    const savedLinks = screen.getAllByRole('link', { name: /Saved/ })
    expect(savedLinks).toHaveLength(1)
    expect(savedLinks[0]).toHaveAttribute('aria-current', 'page')
  })

  it('loads the favorites address directly', async () => {
    renderApp(['/saved/favorites'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Saved · Walplay'))
  })

  it('renders the not-found route for an unknown saved subpath', async () => {
    renderApp(['/saved/later'])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' })
    ).toBeInTheDocument()
  })
})
