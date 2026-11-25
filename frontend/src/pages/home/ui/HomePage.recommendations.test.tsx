import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
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
  getAppConfig: vi.fn(),
  getApiBaseUrl: () => 'http://localhost:4000',
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')
const { getAppConfig } = await import('@/shared/config/env')

const configWith = (recommendationsEnabled: boolean) => ({
  environmentName: 'local' as const,
  applicationVersion: '0.0.0',
  apiBaseUrl: 'http://localhost:4000',
  availabilityEnabled: false,
  trailersEnabled: false,
  recommendationsEnabled,
})

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockResolvedValue(
    pageEnvelope({ items: [movieItem()], section: 'popular' })
  )
  vi.mocked(getAppConfig).mockReturnValue(configWith(false))
  window.localStorage.clear()
})

describe('HomePage recommendation composition', () => {
  it('renders no recommendation surface and issues no request while the flag is off', async () => {
    await renderWithProviders(<HomePage />)

    expect(screen.queryByRole('region', { name: 'Discover' })).not.toBeInTheDocument()
    expect(screen.queryByText('How recommendations work')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'TMDB' })).not.toBeInTheDocument()
    expect(fetchSectionPage).not.toHaveBeenCalled()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Start browsing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
      'href',
      '/browse'
    )
  })

  it('appends the area after the existing Home content with the flag on', async () => {
    vi.mocked(getAppConfig).mockReturnValue(configWith(true))
    const { container } = await renderWithProviders(<HomePage />)

    const region = await screen.findByRole('region', { name: 'Discover' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Start browsing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
      'href',
      '/browse'
    )
    expect(container.querySelectorAll('h1')).toHaveLength(1)

    const browseSection = screen
      .getByRole('heading', { level: 2, name: 'Start browsing' })
      .closest('section')
    if (browseSection === null) {
      throw new Error('expected the existing Start browsing section')
    }
    expect(
      browseSection.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
  })
})
