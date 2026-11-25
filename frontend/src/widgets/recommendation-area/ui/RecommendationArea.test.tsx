import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { QueryClientProvider, createQueryClient } from '@/app/providers/QueryClientProvider'
import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
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
  window.localStorage.clear()
})

describe('RecommendationArea ready and empty baseline', () => {
  it('renders one labelled area, one provider section, and attributed provider-order cards', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    const region = await screen.findByRole('region', { name: 'Discover' })
    expect(within(region).getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(
      within(region).getByRole('heading', { level: 3, name: 'Popular now, Movies' })
    ).toBeInTheDocument()

    const list = within(region).getByRole('list', { name: 'Popular titles' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Fight Club')
    expect(items[1]).toHaveTextContent('Arrival')

    expect(within(region).getByRole('link', { name: /Fight Club, Movies, 1999/ })).toHaveAttribute(
      'href',
      '/browse/movies/title/d2wxOm1vdmllOjU1MA'
    )
    expect(within(region).getByRole('link', { name: /Arrival, Movies, 2016/ })).toHaveAttribute(
      'href',
      '/browse/movies/title/d2wxOm1vdmllOjY4MA'
    )

    expect(within(region).getByRole('img', { name: 'TMDB' })).toBeInTheDocument()
    expect(region).toHaveTextContent(
      'This product uses the TMDB API but is not endorsed or certified by TMDB.'
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
      'href',
      '/browse'
    )

    const text = region.textContent?.toLowerCase() ?? ''
    for (const prohibited of [
      'for you',
      'recommended for you',
      'picked for you',
      'because you watched',
      'matches your taste',
      'match score',
      'availability',
    ]) {
      expect(text).not.toContain(prohibited)
    }
  })

  it('keeps the ready cards within the single provider list limit', async () => {
    const items = Array.from({ length: 15 }, (_, index) =>
      movieItem({
        id: `d2wxOm1vdmllOjIw${String(index).padStart(2, '0')}`,
        title: `Title ${index + 1}`,
      })
    )
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items, section: 'popular' }))
    await renderWithProviders(<HomePage />)

    const list = await screen.findByRole('list', { name: 'Popular titles' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(12)
  })

  it('shows a truthful empty state with Browse and Search actions', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    await renderWithProviders(<HomePage />)

    expect(await screen.findByText('No suggestions are available right now')).toBeInTheDocument()
    expect(
      screen.getByText('No suggestions are available right now').closest('[role="status"]')
    ).not.toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Popular titles' })).not.toBeInTheDocument()
    const browseLinks = screen.getAllByRole('link', { name: 'Browse the catalog' })
    expect(browseLinks).toHaveLength(2)
    expect(browseLinks.every((link) => link.getAttribute('href') === '/browse')).toBe(true)
    expect(screen.getByRole('link', { name: 'Search titles' })).toHaveAttribute('href', '/search')
  })

  it('re-renders a usable Home area after returning from a title detail route', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    const router = createMemoryRouter(
      [
        { path: '/', element: <HomePage /> },
        { path: '/browse/:slug/title/:itemId', element: <p>Detail destination</p> },
      ],
      { initialEntries: ['/'] }
    )
    const user = userEvent.setup()

    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={createQueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nextProvider>
    )

    await user.click(await screen.findByRole('link', { name: /Fight Club, Movies, 1999/ }))
    expect(await screen.findByText('Detail destination')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/browse/movies/title/d2wxOm1vdmllOjU1MA')

    await act(async () => {
      await router.navigate(-1)
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Discover' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Popular now, Movies' })
    ).toBeInTheDocument()
  })
})
