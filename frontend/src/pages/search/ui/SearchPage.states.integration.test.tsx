import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import { CAPABILITIES, movieItem, pageEnvelope } from '@/test/fixtures/catalog'
import { emptyFinalPage, firstSearchPage, searchPageEnvelope } from '@/test/fixtures/catalog/search'
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

const { fetchCapabilities, fetchSectionPage, fetchItem, fetchSearchPage } =
  await import('@/entities/catalog/api/catalogClient')

beforeEach(() => {
  installMatchMediaMock(true)
  vi.mocked(fetchCapabilities)
    .mockReset()
    .mockResolvedValue({ data: { sections: CAPABILITIES } })
  vi.mocked(fetchSectionPage)
    .mockReset()
    .mockResolvedValue(pageEnvelope({ items: [movieItem()], hasMore: false }))
  vi.mocked(fetchItem)
    .mockReset()
    .mockResolvedValue({ data: movieItem(), meta: pageEnvelope({ items: [] }).meta })
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchPage state distinctions', () => {
  it('presents no-results as a successful state with attribution and no retry', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(emptyFinalPage())
    renderApp(['/search?q=the+matrix'])

    expect(
      await screen.findByRole('heading', { name: 'No titles matched “the matrix”' })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByText('Search is temporarily unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('This search cannot be completed')).not.toBeInTheDocument()
  })

  it('presents a timeout as a failure with a retry and no attribution', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT'))
    renderApp(['/search?q=the+matrix'])

    expect(await screen.findByRole('heading', { name: 'Search took too long' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Provider attribution' })).not.toBeInTheDocument()
    expect(screen.queryByText('No titles matched “the matrix”')).not.toBeInTheDocument()
  })

  it('presents VALIDATION_ERROR as editable guidance without a retry', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('VALIDATION_ERROR'))
    renderApp(['/search?q=the+matrix'])

    expect(
      await screen.findByRole('heading', { name: 'This search cannot be completed' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeEnabled()
  })

  it('retries the failed request and shows results when the provider recovers', async () => {
    vi.mocked(fetchSearchPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockResolvedValueOnce(firstSearchPage())
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('list', { name: 'Search results for the matrix' })
    ).toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
  })

  it('keeps the shell, navigation, and language switch usable during a failure', async () => {
    const { i18n } = await import('@/app/i18n')
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('CATALOG_TIMEOUT'))
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])

    await screen.findByRole('heading', { name: 'Search took too long' })
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeEnabled()

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
    expect(
      await screen.findByRole('heading', { name: 'La búsqueda tardó demasiado' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Te damos la bienvenida a Walplay' })
    ).toBeInTheDocument()
  })

  it('focuses the input when the no-results edit action is activated', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(emptyFinalPage())
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])

    await screen.findByRole('heading', { name: 'No titles matched “the matrix”' })
    await user.click(screen.getByRole('button', { name: 'Edit search' }))

    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
  })

  it('renders attribution for stale and partially loaded results', async () => {
    vi.mocked(fetchSearchPage)
      .mockReset()
      .mockResolvedValueOnce(
        searchPageEnvelope({
          items: firstSearchPage().data.items,
          hasMore: false,
          totalPages: 1,
          stale: true,
        })
      )
    const first = renderApp(['/search?q=the+matrix'])
    expect(await screen.findByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
    first.unmount()

    vi.mocked(fetchSearchPage)
      .mockReset()
      .mockResolvedValueOnce(firstSearchPage())
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
    const user = userEvent.setup()
    renderApp(['/search?q=the+matrix'])
    await screen.findByRole('list', { name: 'Search results for the matrix' })
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('More results could not be loaded')).toBeInTheDocument()
    const collection = screen.getByRole('list', { name: 'Search results for the matrix' })
    expect(within(collection).getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('region', { name: 'Provider attribution' })).toBeInTheDocument()
  })
})
