import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { CatalogSectionPreview } from './CatalogSectionPreview'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

const capability = {
  id: 'popular' as const,
  order: 2,
  mediaTypes: ['movie'] as const,
  paginated: true,
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('CatalogSectionPreview state accessibility', () => {
  it('has no critical or serious violations for an error state', async () => {
    vi.mocked(fetchSectionPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))
    const { container } = await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has no critical or serious violations for an empty state', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [] }))
    const { container } = await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has no critical or serious violations for a stale state', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], stale: true })
    )
    const { container } = await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
