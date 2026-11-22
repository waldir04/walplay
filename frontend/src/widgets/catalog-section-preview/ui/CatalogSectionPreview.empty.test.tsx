import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { pageEnvelope } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogSectionPreview } from './CatalogSectionPreview'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
  vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [] }))
})

const capability = {
  id: 'trending' as const,
  order: 1,
  mediaTypes: ['movie'] as const,
  paginated: false,
}

describe('CatalogSectionPreview empty state', () => {
  it('explains that no titles are available now and offers retry', async () => {
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    expect(await screen.findByText('No titles available right now')).toBeInTheDocument()
    expect(screen.getByText(/There are no titles to show here/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers no fabricated titles', async () => {
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )
    await screen.findByText('No titles available right now')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /see all/i })).not.toBeInTheDocument()
  })
})
