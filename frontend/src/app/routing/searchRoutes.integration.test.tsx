import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOVIE_ID, movieItem, providerMeta } from '@/test/fixtures/catalog'
import { firstSearchPage } from '@/test/fixtures/catalog/search'
import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage, fetchItem } = await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchSearchPage).mockReset().mockResolvedValue(firstSearchPage())
  vi.mocked(fetchItem).mockReset().mockResolvedValue({
    data: movieItem(),
    meta: providerMeta(),
  })
})

describe('search routes integration', () => {
  it('renders Search inside the shell from a direct address and marks it current', async () => {
    renderApp(['/search?q=the+matrix'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Search/ })).toHaveAttribute('aria-current', 'page')
    await screen.findByRole('heading', { name: 'Results for “the matrix”' })
  })

  it('opens the existing detail destination and restores the active search with back and forward', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/search?q=the+matrix'])
    const collection = await screen.findByRole('list', {
      name: 'Search results for the matrix',
    })
    const [movieLink] = within(collection).getAllByRole('link')
    await user.click(movieLink as HTMLElement)

    expect(await screen.findByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/browse/movies/title/${MOVIE_ID}`)
    expect(screen.getByRole('link', { name: /Browse/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Return to search' })).toHaveAttribute(
      'href',
      '/search?q=the%20matrix'
    )

    await act(async () => {
      await router.navigate(-1)
    })
    expect(
      await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')

    await act(async () => {
      await router.navigate(1)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
    expect(fetchItem).not.toHaveBeenCalled()
  })

  it('returns from detail with the return action and restores cached results', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(['/search?q=the+matrix'])
    const collection = await screen.findByRole('list', {
      name: 'Search results for the matrix',
    })
    await user.click(within(collection).getAllByRole('link')[0] as HTMLElement)

    await user.click(await screen.findByRole('link', { name: 'Return to search' }))

    expect(
      await screen.findByRole('heading', { name: 'Results for “the matrix”' })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('re-runs the active query in the new language and keeps the search origin', async () => {
    const user = userEvent.setup()
    const { i18n } = await import('@/app/i18n')
    const { router } = renderApp(['/search?q=the+matrix'])
    await screen.findByRole('heading', { name: 'Results for “the matrix”' })

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    await waitFor(() =>
      expect(fetchSearchPage).toHaveBeenCalledWith({
        query: 'the matrix',
        language: 'es',
        page: 1,
      })
    )
    const collection = await screen.findByRole('list', {
      name: 'Resultados de búsqueda de the matrix',
    })
    await user.click(within(collection).getAllByRole('link')[0] as HTMLElement)

    expect(await screen.findByRole('link', { name: 'Volver a la búsqueda' })).toHaveAttribute(
      'href',
      '/search?q=the%20matrix'
    )
    expect(router.state.location.pathname).toBe(`/browse/movies/title/${MOVIE_ID}`)
  })

  it('falls back to the media landing when a detail is opened directly without search state', async () => {
    renderApp([`/browse/movies/title/${MOVIE_ID}`])

    expect(await screen.findByRole('link', { name: 'Return to the catalog' })).toHaveAttribute(
      'href',
      '/browse/movies'
    )
    expect(screen.queryByRole('link', { name: 'Return to search' })).not.toBeInTheDocument()
  })
})
