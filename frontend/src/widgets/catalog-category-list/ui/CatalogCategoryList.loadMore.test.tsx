import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { movieItem, pageEnvelope } from '@/test/fixtures/catalog'
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

describe('CatalogCategoryList load more', () => {
  it('keeps existing items usable while the next page loads', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockReturnValueOnce(new Promise(() => undefined))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fight Club/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/browse/movies/title/')
    )
  })

  it('prevents duplicate submissions', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockReturnValueOnce(new Promise(() => undefined))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    const button = screen.getByRole('button', { name: 'Load more' })
    await user.click(button)
    await user.click(button)

    await waitFor(() => expect(fetchSectionPage).toHaveBeenCalledTimes(2))
  })
})
