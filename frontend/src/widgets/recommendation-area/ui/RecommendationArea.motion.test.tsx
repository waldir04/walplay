import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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
  setMatchMediaMatches(true)
})

describe('RecommendationArea reduced motion', () => {
  it('uses only reduced-motion-safe animation and no attention-seeking motion', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    const { container } = await renderWithProviders(<HomePage />)
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })

    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(container.innerHTML).not.toContain('animate-bounce')
    expect(container.innerHTML).not.toContain('animate-spin')
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('motion-reduce:transition-none')
    }
    expect(container.querySelector('video, audio, [autoplay]')).toBeNull()
    expect(
      screen.queryByRole('button', { name: /next|previous|pause|play/i })
    ).not.toBeInTheDocument()
  })

  it('never advances content or issues another request without a visitor action', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular' })
    )
    await renderWithProviders(<HomePage />)
    const region = await screen.findByRole('region', { name: 'Discover' })
    await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    const before = within(region)
      .getAllByRole('listitem')
      .map((item) => item.textContent)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    expect(
      within(region)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(before)
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('button', { name: /load more|show different/i })
    ).not.toBeInTheDocument()
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0)
  })

  it('keeps the loading skeleton motion-safe when reduced motion is preferred', async () => {
    vi.mocked(fetchSectionPage).mockImplementation(() => new Promise(() => undefined))
    const { container } = await renderWithProviders(<HomePage />)

    await screen.findByText('Recommendations are loading')
    expect(container.innerHTML).toContain('motion-safe:animate-pulse')
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })
})
