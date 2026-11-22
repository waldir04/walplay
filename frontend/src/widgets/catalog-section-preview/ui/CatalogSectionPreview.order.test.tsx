import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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
  vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [movieItem()] }))
})

describe('CatalogSectionPreview order and capabilities', () => {
  it('omits See all for the non-paginated trending section', async () => {
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'trending', order: 1, mediaTypes: ['movie'], paginated: false }}
        language="en"
      />
    )
    await screen.findByText('Fight Club')
    expect(screen.queryByRole('link', { name: /see all/i })).not.toBeInTheDocument()
  })

  it('shows See all only because the capability declares pagination', async () => {
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="tv"
        capability={{ id: 'top-rated', order: 3, mediaTypes: ['movie', 'tv'], paginated: true }}
        language="en"
      />
    )
    await screen.findByRole('heading', { name: 'Top rated' })
    expect(screen.getByRole('link', { name: 'See all Top rated' })).toHaveAttribute(
      'href',
      '/browse/tv-shows/top-rated'
    )
  })

  it('preserves provider order without re-sorting', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({
        items: [
          movieItem({ title: 'Zulu' }),
          movieItem({ id: 'd2wxOm1vdmllOjY4MA', title: 'Alpha' }),
        ],
      })
    )
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )
    const items = await screen.findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Zulu')
    expect(items[1]).toHaveTextContent('Alpha')
  })

  it('never exceeds one provider page in a preview', async () => {
    await renderWithProviders(
      <CatalogSectionPreview
        mediaType="movie"
        capability={{ id: 'popular', order: 2, mediaTypes: ['movie'], paginated: true }}
        language="en"
      />
    )
    await screen.findByText('Fight Club')
    expect(fetchSectionPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
  })
})
