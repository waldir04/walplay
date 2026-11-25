import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { itemWithLongSpanishTitle, itemWithoutPoster } from '@/test/fixtures/catalog/incomplete'
import { setMatchMediaMatches } from '@/test/matchMedia'
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
  setMatchMediaMatches(false)
})

describe('RecommendationArea responsive contract', () => {
  it('uses the shared responsive grid and no fixed widths that force horizontal scrolling', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), itemWithLongSpanishTitle()], section: 'popular' })
    )
    const { container } = await renderWithProviders(<HomePage />)
    const region = await screen.findByRole('region', { name: 'Discover' })
    const list = within(region).getByRole('list', { name: 'Popular titles' })

    expect(region.className).toContain('min-w-0')
    expect(list.className).toContain('grid-cols-2')
    expect(list.className).toContain('md:grid-cols-3')
    expect(list.className).toContain('lg:grid-cols-4')
    expect(list.className).toContain('xl:grid-cols-5')
    expect(region.innerHTML).not.toMatch(/\bw-\[\d+px\]/)
    expect(region.innerHTML).not.toContain('whitespace-nowrap')
    expect(container.querySelector('[style*="width"]')).toBeNull()

    for (const listItem of within(list).getAllByRole('listitem')) {
      expect(listItem.className).toContain('min-w-0')
    }
  })

  it('wraps long localized titles without losing the title identity', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [itemWithLongSpanishTitle()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />, { locale: 'es' })

    const title = await screen.findByText(itemWithLongSpanishTitle().title)
    expect(title.className).toContain('line-clamp-2')
    expect(
      screen.getByRole('link', { name: new RegExp(itemWithLongSpanishTitle().title) })
    ).toBeInTheDocument()
  })

  it('falls back to the shared poster placeholder when artwork is missing', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [itemWithoutPoster()], section: 'popular' })
    )
    const { container } = await renderWithProviders(<HomePage />)

    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    expect(screen.queryByRole('img', { name: /No Artwork/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /No Artwork, Movies/ })).toBeInTheDocument()
    expect(container.innerHTML).toContain('aspect-[2/3]')
  })

  it('meets the control target sizes and keeps the copy operable at supported widths', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)
    const region = await screen.findByRole('region', { name: 'Discover' })

    const summary = within(region).getByText('How recommendations work')
    expect(summary.className).toContain('min-h-11')
    for (const button of within(region).getAllByRole('button')) {
      expect(button.className).toContain('min-h-11')
      expect(button.className).toContain('min-w-11')
    }
    expect(
      within(region).getByText('Based on provider popularity, not personalized').className
    ).toContain('text-caption')
  })
})
