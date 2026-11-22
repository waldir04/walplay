import { screen, waitFor } from '@testing-library/react'
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

describe('CatalogCategoryList end state', () => {
  it('removes load more and shows the end-of-list message on the final page', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: false })
    )
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )

    expect(await screen.findByText('You have reached the end of the list.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('moves focus to the end status when the control had focus', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockResolvedValueOnce(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    const button = screen.getByRole('button', { name: 'Load more' })
    button.focus()
    await user.click(button)

    const end = await screen.findByText('You have reached the end of the list.')
    await waitFor(() => expect(end).toHaveFocus())
  })
})
