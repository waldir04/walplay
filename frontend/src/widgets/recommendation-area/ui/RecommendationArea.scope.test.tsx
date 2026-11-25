import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAVED_LIBRARY_STORAGE_KEY } from '@/entities/saved-library'
import { HomePage } from '@/pages/home'
import { APP_ROUTES } from '@/shared/config/routes'
import { navigationItems } from '@/widgets/app-shell/model/navigationItems'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
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

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockResolvedValue(
    pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
  )
  window.localStorage.clear()
  window.localStorage.setItem(
    SAVED_LIBRARY_STORAGE_KEY,
    JSON.stringify(savedEnvelope({ watchlist: [savedEntry()], favorites: [] }))
  )
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_LIBRARY_STORAGE_KEY }))
})

describe('RecommendationArea guest scope', () => {
  it('never uses saved titles as a seed and adds no account or personalization surface', async () => {
    await renderWithProviders(<HomePage />)
    const region = await screen.findByRole('region', { name: 'Discover' })
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    expect(vi.mocked(fetchSectionPage).mock.calls[0]?.[0]).not.toHaveProperty('itemId')
    expect(vi.mocked(fetchSectionPage).mock.calls[0]?.[0]).not.toHaveProperty('seed')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)

    expect(region).toHaveTextContent(
      'Walplay does not use the titles you saved to choose these suggestions.'
    )
    expect(region).toHaveTextContent(
      'You are browsing as a guest. Personalized recommendations are not available in guest mode.'
    )

    expect(
      screen.queryByRole('button', {
        name: /sign in|sign up|account|profile|sync|personaliz|dismiss|reset|different|rotation/i,
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: /sign in|sign up|account|profile|sync|personaliz|dismiss|reset|different/i,
      })
    ).not.toBeInTheDocument()

    const regionText = region.textContent ?? ''
    expect(regionText).not.toMatch(/sign in|sign up|create an account|sync your|upgrade/i)

    expect(APP_ROUTES.every((route) => !/recommend/i.test(route.path))).toBe(true)
    expect(navigationItems.every((item) => !/recommend/i.test(item.to))).toBe(true)
  })
})
