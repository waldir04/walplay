import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { emptyButMorePage, firstSearchPage } from '@/test/fixtures/catalog/search'
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
  await renderWithProviders(
    <SearchResults
      query={buildSearchQuery('the matrix')}
      language="en"
      attribution={<p>Provider attribution slot</p>}
    />
  )
}

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults interim-empty page', () => {
  it('states the page had no titles, keeps load more, and issues no automatic request', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(emptyButMorePage())
    await renderResults()

    await waitFor(() =>
      expect(
        screen.getAllByText('This page had no titles. Load more to keep looking.').length
      ).toBeGreaterThan(0)
    )
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    expect(screen.getByText('Provider attribution slot')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('preserves existing results when a later page is empty but has more', async () => {
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(emptyButMorePage())
    const user = userEvent.setup()
    await renderResults()
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() =>
      expect(
        screen.getAllByText('This page had no titles. Load more to keep looking.').length
      ).toBeGreaterThan(0)
    )
    const collection = screen.getByRole('list', { name: 'Search results for the matrix' })
    expect(within(collection).getAllByRole('link')).toHaveLength(2)
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled()
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)
  })
})
