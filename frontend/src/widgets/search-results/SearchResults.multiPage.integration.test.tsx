import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { movieItem } from '@/test/fixtures/catalog'
import {
  finalSearchPage,
  firstSearchPage,
  searchPageEnvelope,
  secondSearchPage,
} from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchResults } from './ui/SearchResults'

vi.mock('@/entities/catalog/api/catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage } = await import('@/entities/catalog/api/catalogClient')

const renderResults = async () => {
  await renderWithProviders(<SearchResults query={buildSearchQuery('the matrix')} language="en" />)
  await screen.findByRole('list', { name: 'Search results for the matrix' })
}

const titles = (): (string | null)[] =>
  within(screen.getByRole('list', { name: 'Search results for the matrix' }))
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label')?.split(',')[0] ?? null)

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults multi-page integration', () => {
  it('loads the first page, appends two pages without duplicates, and reaches the end state', async () => {
    const thirdPage = searchPageEnvelope({
      items: [movieItem({ id: 'd2wxOm1vdmllOjYwNQ', title: 'The Matrix Revolutions' })],
      page: 3,
      hasMore: false,
      totalPages: 3,
    })
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(secondSearchPage())
      .mockResolvedValueOnce(thirdPage)
    const user = userEvent.setup()
    await renderResults()

    expect(titles()).toEqual(['The Matrix', 'The Matrix Show'])

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('The Matrix Reloaded')
    expect(titles()).toEqual(['The Matrix', 'The Matrix Show', 'The Matrix Reloaded'])

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('The Matrix Revolutions')
    expect(titles()).toEqual([
      'The Matrix',
      'The Matrix Show',
      'The Matrix Reloaded',
      'The Matrix Revolutions',
    ])
    expect(screen.getByText('End of results for the matrix')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(fetchSearchPage).toHaveBeenCalledTimes(3)
  })

  it('keeps results usable after a failed later page and recovers on retry', async () => {
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockRejectedValueOnce(new Error('page two failed'))
      .mockResolvedValueOnce(finalSearchPage())
    const user = userEvent.setup()
    await renderResults()

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('More results could not be loaded')).toBeInTheDocument()
    expect(titles()).toEqual(['The Matrix', 'The Matrix Show'])

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    )
    expect(titles()).toEqual(['The Matrix', 'The Matrix Show', 'The Matrix Revolutions'])
    expect(screen.getByText('The Matrix Revolutions')).toBeInTheDocument()
  })
})
