import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'
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

const capability = {
  id: 'popular' as const,
  order: 2,
  mediaTypes: ['movie', 'tv'] as const,
  paginated: true,
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('CatalogSectionPreview', () => {
  it('renders a labelled region in provider order with a See all action', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem(), secondMovieItem()], section: 'popular' })
    )
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Popular' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Popular' })
    expect(list).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Fight Club')
    expect(items[1]).toHaveTextContent('Arrival')
    expect(screen.getByRole('link', { name: 'See all Popular' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
  })

  it('never paginates: no load-more control is rendered', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: true })
    )
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    await screen.findByText('Fight Club')
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(fetchSectionPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('shows a layout-matching skeleton while loading', async () => {
    vi.mocked(fetchSectionPage).mockReturnValue(new Promise(() => undefined))
    const { container } = await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    await waitFor(() =>
      expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true')
    )
    expect(container.innerHTML).toContain('aspect-[2/3]')
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument()
  })

  it('isolates an inline failure with retry', async () => {
    vi.mocked(fetchSectionPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], section: 'popular' }))
    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This section could not be loaded')
    expect(alert).not.toHaveTextContent('502')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Fight Club')).toBeInTheDocument()
    expect(fetchSectionPage).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state with retry and media switch', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    expect(await screen.findByText('No titles available right now')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Switch media type' })).toHaveAttribute(
      'href',
      '/browse/tv-shows'
    )
  })

  it('labels stale data with a localized update time', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], section: 'popular', stale: true })
    )
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )

    expect(await screen.findByText(/Cached data from/)).toBeInTheDocument()
  })

  it('treats an all-invalid page as an empty state, not a blank grid', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="en" />
    )
    expect(await screen.findByText('No titles available right now')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders localized states in Spanish', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [], section: 'popular' }))
    await renderWithProviders(
      <CatalogSectionPreview mediaType="movie" capability={capability} language="es" />,
      { locale: 'es' }
    )
    expect(await screen.findByText('No hay títulos disponibles ahora')).toBeInTheDocument()
  })
})
