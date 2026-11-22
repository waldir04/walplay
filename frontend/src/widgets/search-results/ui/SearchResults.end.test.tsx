import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import {
  finalSearchPage,
  firstSearchPage,
  searchPageEnvelope,
} from '@/test/fixtures/catalog/search'
import { renderWithProviders } from '@/test/renderWithProviders'

import { SearchResults } from './SearchResults'

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

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults end state', () => {
  it('removes load more, announces the end, and moves focus when the control had focus', async () => {
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(finalSearchPage())
    const user = userEvent.setup()
    await renderResults()

    const loadMore = screen.getByRole('button', { name: 'Load more' })
    await user.click(loadMore)

    const end = await screen.findByText('End of results for the matrix')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull())
    expect(end).toHaveAttribute('tabindex', '-1')
    await waitFor(() => expect(document.activeElement).toBe(end))
    expect(screen.getByRole('status').textContent).toBe('End of results for the matrix')
  })

  it('shows the end message without a load-more control when the first page is final', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(
      searchPageEnvelope({
        items: firstSearchPage().data.items,
        hasMore: false,
        totalPages: 1,
      })
    )
    await renderResults()

    expect(screen.getByText('End of results for the matrix')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })
})
