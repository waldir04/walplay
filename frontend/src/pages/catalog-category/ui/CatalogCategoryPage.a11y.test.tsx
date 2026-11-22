import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'
import { runAxe } from '@/test/axe'

import { CatalogCategoryPage } from './CatalogCategoryPage'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular' }))
})

describe('CatalogCategoryPage accessibility', () => {
  it('has no critical or serious violations when loaded', async () => {
    const { container } = await renderWithProviders(<CatalogCategoryPage />, {
      initialEntries: ['/browse/movies/popular'],
    })
    await screen.findByText('Fight Club')
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })
})
