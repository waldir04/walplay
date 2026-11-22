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

describe('CatalogCategoryList rapid activation', () => {
  it('issues one request per settled activation while pending', async () => {
    let resolveSecond: (value: ReturnType<typeof pageEnvelope>) => void = () => undefined
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        })
      )
      .mockResolvedValueOnce(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    const button = screen.getByRole('button', { name: 'Load more' })
    await user.click(button)
    await user.click(button)
    await user.click(button)

    await waitFor(() => expect(fetchSectionPage).toHaveBeenCalledTimes(2))
    resolveSecond(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))
    await screen.findByText('Arrival')

    expect(screen.getAllByText('Arrival')).toHaveLength(1)
  })
})
