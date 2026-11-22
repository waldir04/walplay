import { screen, waitFor, within } from '@testing-library/react'
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

const titles = (): (string | null)[] =>
  within(screen.getByRole('list', { name: 'Search results for the matrix' }))
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label')?.split(',')[0] ?? null)

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('SearchResults later-page error', () => {
  it('keeps loaded results with an inline retry for that page only', async () => {
    const retry = deferred<ReturnType<typeof searchPageEnvelope>>()
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockRejectedValueOnce(new Error('later page failed'))
      .mockImplementationOnce(() => retry.promise)
    const user = userEvent.setup()
    await renderResults()

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('More results could not be loaded')).toBeInTheDocument()
    expect(titles()).toEqual(['The Matrix', 'The Matrix Show'])
    expect(fetchSearchPage).toHaveBeenCalledTimes(2)

    const retryButton = screen.getByRole('button', { name: 'Try again' })
    await user.click(retryButton)
    expect(retryButton).toBeDisabled()
    await user.click(retryButton)
    expect(fetchSearchPage).toHaveBeenCalledTimes(3)
    expect(fetchSearchPage).toHaveBeenNthCalledWith(3, {
      query: 'the matrix',
      language: 'en',
      page: 2,
    })

    retry.resolve(finalSearchPage())
    expect(await screen.findByText('The Matrix Revolutions')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('End of results for the matrix')
    )
  })
})
