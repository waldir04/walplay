import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
import { renderWithProviders } from '@/test/renderWithProviders'

import { CatalogCategoryList } from './CatalogCategoryList'

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

describe('CatalogCategoryList announcements', () => {
  it('announces the appended count once', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockResolvedValueOnce(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('1 more title added')).toBeInTheDocument()
    expect(screen.getAllByText('1 more title added')).toHaveLength(1)
  })

  it('does not announce on initial load', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: false })
    )
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    expect(screen.queryByText(/more titles? added/)).not.toBeInTheDocument()
  })

  it('uses plural forms for more than one appended title', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockResolvedValueOnce(
        pageEnvelope({
          items: [secondMovieItem(), movieItem({ id: 'd2wxOm1vdmllOjQ1Ng', title: 'Moon' })],
          page: 2,
        })
      )

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('2 more titles added')).toBeInTheDocument()
  })

  it('does not duplicate the catalog language announcement', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: false })
    )
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    expect(screen.queryByText(/language changed/i)).not.toBeInTheDocument()
  })
})
