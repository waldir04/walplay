import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/home'
import { CatalogApiError } from '@/shared/api/httpClient'
import type { CatalogErrorCode } from '@/shared/api/httpClient'
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

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  window.localStorage.clear()
})

describe('RecommendationArea error state', () => {
  const cases: readonly (readonly [CatalogErrorCode, string])[] = [
    ['CATALOG_RATE_LIMITED', 'Suggestions are temporarily limited'],
    ['CATALOG_TIMEOUT', 'Suggestions took too long'],
    ['CATALOG_UNAVAILABLE', 'This area could not be loaded'],
  ]

  it.each(cases)(
    'renders a contained alert for %s without raw provider detail',
    async (code, copy) => {
      vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError(code, 500))
      await renderWithProviders(<HomePage />)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(copy)
      expect(alert.textContent).not.toMatch(/CATALOG_|500|INTERNAL|stack/i)
      expect(
        screen.getByRole('heading', { level: 1, name: 'Welcome to Walplay' })
      ).toBeInTheDocument()
      const browseLinks = screen.getAllByRole('link', { name: 'Browse the catalog' })
      expect(browseLinks.every((link) => link.getAttribute('href') === '/browse')).toBe(true)
      expect(screen.getByText('How recommendations work')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'TV shows' })).toBeInTheDocument()
      expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    }
  )

  it('re-requests exactly once on retry and re-enables after repeated failure', async () => {
    vi.mocked(fetchSectionPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], section: 'popular' }))
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)

    await screen.findByRole('alert')
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(fetchSectionPage).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('This area could not be loaded')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Popular now, Movies' })
    ).toBeInTheDocument()
    expect(fetchSectionPage).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables the retry control while the new request is pending', async () => {
    vi.mocked(fetchSectionPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_TIMEOUT', 504))
      .mockImplementationOnce(() => new Promise(() => undefined))
    const user = userEvent.setup()
    await renderWithProviders(<HomePage />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    const retrying = await screen.findByRole('button', { name: 'Trying again…' })
    expect(retrying).toBeDisabled()
    expect(retrying).toHaveAttribute('aria-busy', 'true')
    expect(fetchSectionPage).toHaveBeenCalledTimes(2)
  })
})
