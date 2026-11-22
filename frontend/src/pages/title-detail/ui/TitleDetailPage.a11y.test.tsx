import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { TitleDetailPage } from './TitleDetailPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchItem } = await import('@/entities/catalog/api/catalogClient')

const envelope = () => ({
  data: movieItem(),
  meta: {
    language: 'en-US' as const,
    stale: false,
    lastUpdatedAt: '2026-11-22T15:00:00.000Z',
    source: 'provider' as const,
  },
})

beforeEach(() => {
  vi.mocked(fetchItem).mockReset()
})

const renderAt = () =>
  renderWithProviders(<TitleDetailPage />, {
    initialEntries: [`/browse/movies/title/${MOVIE_ID}`],
  })

describe('TitleDetailPage accessibility', () => {
  it('has no critical or serious violations when loaded', async () => {
    vi.mocked(fetchItem).mockResolvedValue(envelope())
    const { container } = await renderAt()
    await screen.findByRole('heading', { name: 'Fight Club' })
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has no critical or serious violations for the not-found state', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_NOT_FOUND', 404))
    const { container } = await renderAt()
    await screen.findByRole('alert')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has no critical or serious violations for the unavailable state', async () => {
    vi.mocked(fetchItem).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
    const { container } = await renderAt()
    await screen.findByRole('alert')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
