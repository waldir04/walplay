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

describe('CatalogSectionPreview all-invalid page', () => {
  it('shows an empty state instead of a blank grid or crash', async () => {
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )

    expect(await screen.findByText('No titles available right now')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
