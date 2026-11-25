import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogKeys } from '@/entities/catalog'
import { createQueryClient } from '@/app/providers/QueryClientProvider'
import { HomePage } from '@/pages/home'
import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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

const politeMessages = (): string[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[aria-live="polite"]')).map(
    (region) => region.textContent ?? ''
  )

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  window.localStorage.clear()
})

describe('RecommendationArea announcements', () => {
  it('stays silent during loading and announces a settled result once', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    expect(politeMessages()).toEqual([''])
    await waitFor(() => expect(politeMessages()).toEqual(['Popular suggestions updated.']))
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    expect(politeMessages()).toEqual(['Popular suggestions updated.'])
  })

  it('announces a stale change without duplicating the fresh announcement', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    const queryClient = createQueryClient()
    await renderWithProviders(<HomePage />, { queryClient })
    await waitFor(() => expect(politeMessages()).toEqual(['Popular suggestions updated.']))

    await act(async () => {
      queryClient.setQueryData(
        catalogKeys.section('movie', 'popular', 'en', 1),
        pageEnvelope({ items: [movieItem()], section: 'popular', stale: true })
      )
    })

    await waitFor(() =>
      expect(politeMessages()).toEqual(['Showing previously loaded suggestions.'])
    )
  })

  it('announces empty and error outcomes with distinct copy', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    const empty = await renderWithProviders(<HomePage />)
    await waitFor(() => expect(politeMessages()).toEqual(['No popular suggestions are available.']))
    empty.unmount()

    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    await renderWithProviders(<HomePage />)
    await waitFor(() => expect(politeMessages()).toEqual(['Suggestions could not be loaded.']))
  })
})
