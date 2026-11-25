import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
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
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockImplementation(() => new Promise(() => undefined))
  window.localStorage.clear()
})

describe('RecommendationArea loading state', () => {
  it('reserves the section layout with a decorative skeleton and an announced busy region', async () => {
    const { container } = await renderWithProviders(<HomePage />)

    const region = await screen.findByRole('region', { name: 'Discover' })
    expect(region).toHaveAttribute('aria-busy', 'true')

    const loadingLabel = within(region).getByText('Recommendations are loading')
    expect(loadingLabel.className).toContain('sr-only')

    const skeletonGrid = container.querySelector('ul[aria-hidden="true"]')
    expect(skeletonGrid).not.toBeNull()
    expect(skeletonGrid?.querySelectorAll('li')).toHaveLength(5)
    expect(container.innerHTML).toContain('aspect-[2/3]')
    expect(container.innerHTML).toContain('motion-safe:animate-pulse')

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    expect(screen.getByText('How recommendations work')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Movies' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'TV shows' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /load|next|more/i })).not.toBeInTheDocument()
  })
})
