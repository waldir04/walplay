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

describe('CatalogCategoryList', () => {
  it('renders the first page in provider order and a load-more action', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({
        items: [movieItem(), secondMovieItem()],
        page: 1,
        hasMore: true,
        totalPages: 2,
      })
    )
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )

    expect(await screen.findByText('Fight Club')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Fight Club')
    expect(items[1]).toHaveTextContent('Arrival')
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    expect(screen.queryByText('You have reached the end of the list.')).not.toBeInTheDocument()
  })

  it('appends the next page below existing items with a busy control', async () => {
    let resolveSecond: (value: ReturnType<typeof pageEnvelope>) => void = () => undefined
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        })
      )

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(screen.getByRole('button', { name: 'Load more' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Load more' })).toHaveAttribute('aria-busy', 'true')

    resolveSecond(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    expect(await screen.findByText('Arrival')).toBeInTheDocument()
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('loads page one only on a direct open', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: true })
    )
    await renderWithProviders(
      <CatalogCategoryList mediaType="tv" section="top-rated" language="es" />
    )
    await screen.findByText('Fight Club')

    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'tv',
      section: 'top-rated',
      language: 'es',
      page: 1,
    })
  })
})
