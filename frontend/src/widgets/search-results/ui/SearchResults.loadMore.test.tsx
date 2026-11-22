import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery } from '@/entities/catalog'
import { movieItem, tvItem } from '@/test/fixtures/catalog'
import {
  firstSearchPage,
  searchPageEnvelope,
  secondSearchPage,
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

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

const deferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const renderResults = async () => {
  await renderWithProviders(<SearchResults query={buildSearchQuery('the matrix')} language="en" />)
  await screen.findByRole('list', { name: 'Search results for the matrix' })
}

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults load more', () => {
  it('requests one page per activation and disables the control while fetching', async () => {
    const secondPage = deferred<ReturnType<typeof searchPageEnvelope>>()
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockImplementationOnce(() => secondPage.promise)
    const user = userEvent.setup()
    await renderResults()

    const loadMore = screen.getByRole('button', { name: 'Load more' })
    await user.click(loadMore)

    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(2))
    expect(fetchSearchPage).toHaveBeenNthCalledWith(2, {
      query: 'the matrix',
      language: 'en',
      page: 2,
    })
    expect(loadMore).toBeDisabled()
    expect(loadMore).toHaveAttribute('aria-busy', 'true')

    await user.click(loadMore)
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)

    secondPage.resolve(secondSearchPage())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled())
  })

  it('appends pages below existing results without reordering or duplicating ids', async () => {
    const duplicate = firstSearchPage().data.items[0]!
    const newItem = movieItem({ id: 'd2wxOm1vdmllOjYwMw', title: 'The Matrix Reloaded' })
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(
        searchPageEnvelope({ items: [duplicate, newItem], page: 2, hasMore: false, totalPages: 2 })
      )
    const user = userEvent.setup()
    await renderResults()

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('The Matrix Reloaded')

    const collection = screen.getByRole('list', { name: 'Search results for the matrix' })
    const links = within(collection).getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links.map((link) => link.getAttribute('aria-label')?.split(',')[0])).toEqual([
      'The Matrix',
      'The Matrix Show',
      'The Matrix Reloaded',
    ])
    expect(screen.getAllByText('The Matrix')).toHaveLength(1)
  })

  it('announces the number of newly added titles once per append', async () => {
    const added = tvItem({ id: 'd2wxOnR2OjIwMA', title: 'Added Show' })
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(
        searchPageEnvelope({ items: [added], page: 2, hasMore: true, totalPages: 3 })
      )
    const user = userEvent.setup()
    await renderResults()

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('1 more title added')
    )
    expect(screen.getByText('3 titles shown')).toBeInTheDocument()
  })
})
