import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY, getSavedLibraryStore } from '@/entities/saved-library'
import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { savedEnvelope, savedEntry } from '@/test/fixtures/saved'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

vi.mock('@/shared/config/env', () => ({
  getAppConfig: () => ({
    environmentName: 'local',
    applicationVersion: '0.0.0',
    apiBaseUrl: 'http://localhost:4000',
    availabilityEnabled: false,
    trailersEnabled: false,
    recommendationsEnabled: true,
  }),
  getApiBaseUrl: () => 'http://localhost:4000',
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

const seedSaved = (): void => {
  window.localStorage.setItem(
    SAVED_LIBRARY_STORAGE_KEY,
    JSON.stringify(savedEnvelope({ watchlist: [savedEntry()], favorites: [] }))
  )
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  window.localStorage.clear()
})

describe('RecommendationArea empty states', () => {
  it('renders a calm status panel when the provider returns no items', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    await renderWithProviders(<HomePage />)

    const message = await screen.findByText('No suggestions are available right now')
    const panel = message.closest('[role="status"]')
    expect(panel).not.toBeNull()
    expect(message.closest('[role="alert"]')).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Popular titles' })).not.toBeInTheDocument()
    expect(
      within(panel as HTMLElement).getByRole('link', { name: 'Browse the catalog' })
    ).toHaveAttribute('href', '/browse')
    expect(
      within(panel as HTMLElement).getByRole('link', { name: 'Search titles' })
    ).toHaveAttribute('href', '/search')
    expect(screen.getByRole('region', { name: 'Discover' }).textContent).not.toMatch(
      /account|sign in|sync/i
    )
  })

  it('distinguishes an all-excluded result from a provider failure', async () => {
    seedSaved()
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    const message = await screen.findByText('No suggestions are left to show')
    const panel = message.closest('[role="status"]')
    expect(panel).not.toBeNull()
    expect(panel).toHaveTextContent('The available popular titles are already in your saved lists.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Fight Club/ })).not.toBeInTheDocument()
    expect(getSavedLibraryStore().getSnapshot().counts.watchlist).toBe(1)
  })
})
