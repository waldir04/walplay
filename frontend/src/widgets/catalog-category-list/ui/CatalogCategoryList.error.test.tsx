import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
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

describe('CatalogCategoryList later-page failure', () => {
  it('keeps existing items and shows an inline retry instead of a page error', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE', 502))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.queryByText('This section could not be loaded')).not.toBeInTheDocument()
  })

  it('retries only the failed page and appends its items', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_TIMEOUT'))
      .mockResolvedValueOnce(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    const user = userEvent.setup()
    await renderWithProviders(
      <CatalogCategoryList mediaType="movie" section="popular" language="en" />
    )
    await screen.findByText('Fight Club')
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    const alert = await screen.findByRole('alert')
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Arrival')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
