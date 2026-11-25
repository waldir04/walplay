import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
import { runAxe } from '@/test/axe'
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

describe('RecommendationArea accessibility', () => {
  it('has no automated violations in ready, loading, empty, and error states', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
    const ready = await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    expect(await runAxe(ready.container)).toHaveNoViolations()
    ready.unmount()

    vi.mocked(fetchSectionPage).mockImplementation(() => new Promise(() => undefined))
    const loading = await renderWithProviders(<HomePage />)
    await screen.findByText('Recommendations are loading')
    expect(await runAxe(loading.container)).toHaveNoViolations()
    loading.unmount()

    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    const empty = await renderWithProviders(<HomePage />)
    await screen.findByText('No suggestions are available right now')
    expect(await runAxe(empty.container)).toHaveNoViolations()
    empty.unmount()

    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const failed = await renderWithProviders(<HomePage />)
    await screen.findByRole('alert')
    expect(await runAxe(failed.container)).toHaveNoViolations()
  })

  it('exposes a named region, named section, and a labelled semantic list', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)

    const region = await screen.findByRole('region', { name: 'Discover' })
    const sectionHeading = within(region).getByRole('heading', {
      level: 3,
      name: 'Popular now, Movies',
    })
    const section = sectionHeading.closest('section')
    expect(section).not.toBeNull()
    expect(section).toHaveAttribute('aria-labelledby', sectionHeading.id)
    expect(within(region).getByRole('list', { name: 'Popular titles' })).toBeInTheDocument()
    expect(within(region).getAllByRole('listitem')).toHaveLength(2)
  })

  it('keeps the explanation, scope, cards, and actions keyboard reachable in logical order', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)
    const region = await screen.findByRole('region', { name: 'Discover' })
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    expect(document.body).toHaveFocus()

    const sequence: HTMLElement[] = []
    for (let index = 0; index < 6; index += 1) {
      await user.tab()
      sequence.push(document.activeElement as HTMLElement)
    }

    const summary = within(region).getByText('How recommendations work')
    const movies = within(region).getByRole('button', { name: 'Movies' })
    const tv = within(region).getByRole('button', { name: 'TV shows' })
    const firstCard = within(region).getByRole('link', { name: /Fight Club, Movies, 1999/ })
    const secondCard = within(region).getByRole('link', { name: /Arrival, Movies, 2016/ })

    const indexOf = (element: HTMLElement): number => sequence.indexOf(element)
    expect(indexOf(summary)).toBeGreaterThan(-1)
    expect(indexOf(summary)).toBeLessThan(indexOf(movies))
    expect(indexOf(movies)).toBeLessThan(indexOf(tv))
    expect(indexOf(tv)).toBeLessThan(indexOf(firstCard))
    expect(indexOf(firstCard)).toBeLessThan(indexOf(secondCard))

    for (const element of [summary, movies, tv, firstCard, secondCard]) {
      expect(element.className).toContain('focus-visible:outline')
    }
    for (const control of [summary, movies, tv]) {
      expect(control.className).toContain('min-h-11')
    }
    expect(movies.className).toContain('min-w-11')
    expect(tv.className).toContain('min-w-11')
  })

  it('keeps focus on an activated media scope control', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)
    const tv = await screen.findByRole('button', { name: 'TV shows' })

    tv.focus()
    await user.keyboard('{Enter}')

    expect(tv).toHaveFocus()
    expect(tv).toHaveAttribute('aria-pressed', 'true')
  })
})
