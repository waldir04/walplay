import { screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAPABILITIES, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage, fetchItem } =
  await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], section: 'popular', hasMore: true }))
  vi.mocked(fetchItem).mockReset()
})

describe('category and detail journey', () => {
  it('targets a stable category address from See all', async () => {
    renderApp(['/browse/movies'])
    expect(await screen.findByRole('link', { name: 'See all Popular' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )
  })

  it('opens the category, activates a card, and restores views with back and forward', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/browse/movies'])
    await screen.findAllByRole('link', { name: 'See all Popular' })

    await user.click(screen.getAllByRole('link', { name: 'See all Popular' })[0] as HTMLElement)
    expect(await screen.findByRole('heading', { name: 'Popular · Movies' })).toBeInTheDocument()

    const card = await screen.findByRole('link', { name: /Fight Club/ })
    await user.click(card)
    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/browse/movies/title/${MOVIE_ID}`)
    expect(screen.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies/popular'
    )

    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByRole('heading', { name: 'Popular · Movies' })).toBeInTheDocument()

    await act(async () => {
      await router.navigate(1)
    })
    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(fetchItem).not.toHaveBeenCalled()
  })

  it('keeps Browse active on nested catalog paths', async () => {
    renderApp(['/browse/movies/popular'])
    await screen.findByRole('heading', { name: 'Popular · Movies' })
    expect(screen.getByRole('link', { name: /Browse/ })).toHaveAttribute('aria-current', 'page')
  })

  it('renders unknown nested catalog paths inside the shell', async () => {
    renderApp(['/browse/movies/not-a-route'])
    expect(await screen.findByRole('heading', { name: 'Title not found' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('keeps category addresses type-specific', async () => {
    renderApp(['/browse/tv-shows/top-rated'])
    await screen.findByRole('heading', { name: 'Top rated · TV Shows' })
    expect(fetchSectionPage).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'tv', section: 'top-rated' })
    )
    await waitFor(() => expect(screen.queryByText('Browse Movies')).not.toBeInTheDocument())
  })
})
