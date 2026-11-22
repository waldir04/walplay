import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope, secondMovieItem, thirdMovieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCategoryList } from './ui/CatalogCategoryList'

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
})

describe('CatalogCategoryList multi-page journey', () => {
  it('appends successive pages without duplicates or reordering, then ends', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(
        pageEnvelope({ items: [movieItem()], page: 1, hasMore: true, totalPages: 3 })
      )
      .mockResolvedValueOnce(
        pageEnvelope({
          items: [secondMovieItem(), movieItem()],
          page: 2,
          hasMore: true,
          totalPages: 3,
        })
      )
      .mockResolvedValueOnce(pageEnvelope({ items: [thirdMovieItem()], page: 3, hasMore: false }))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('Arrival')
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('Moon')

    const titles = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(titles).toHaveLength(3)
    expect(titles[0]).toContain('Fight Club')
    expect(titles[1]).toContain('Arrival')
    expect(titles[2]).toContain('Moon')
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByText('You have reached the end of the list.')).toBeInTheDocument()
  })

  it('preserves the loaded list when a later page fails', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="top-rated" language="es" />,
      {
        locale: 'es',
      }
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Cargar más' }))

    await screen.findByRole('alert')
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeInTheDocument()
  })
})
