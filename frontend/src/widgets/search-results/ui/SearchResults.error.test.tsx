import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearchQuery, catalogKeys } from '@/entities/catalog'
import { CatalogApiError } from '@/shared/api/httpClient'
import { SEARCH_SETTLE_MS } from '@/shared/config/constants'
import { firstSearchPage, searchPageEnvelope } from '@/test/fixtures/catalog/search'
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

const renderResults = async (options: { queryClient?: QueryClient } = {}) =>
  renderWithProviders(
    <SearchResults
      query={buildSearchQuery('the matrix')}
      language="en"
      attribution={<p>Provider attribution slot</p>}
    />,
    options
  )

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SearchResults failure states', () => {
  it.each([
    ['CATALOG_UNAVAILABLE', 'Search is temporarily unavailable'],
    ['CATALOG_INVALID_RESPONSE', 'Search is temporarily unavailable'],
    ['INTERNAL_ERROR', 'Search is temporarily unavailable'],
    ['CATALOG_RATE_LIMITED', 'Search is temporarily limited'],
    ['CATALOG_TIMEOUT', 'Search took too long'],
  ] as const)('renders the localized state for %s with a retry', async (code, title) => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError(code))
    await renderResults()

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/Could not be completed/)).not.toBeInTheDocument()
    expect(screen.queryByText('Provider attribution slot')).not.toBeInTheDocument()
  })

  it('maps VALIDATION_ERROR to editable guidance without a retry action or automatic repetition', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('VALIDATION_ERROR'))
    await renderResults()

    expect(
      await screen.findByRole('heading', { name: 'This search cannot be completed' })
    ).toBeInTheDocument()
    expect(screen.getByText('Check the title and try a different search.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_SETTLE_MS * 2)
    })
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)
  })

  it('retries only the failed request and prevents concurrent duplicate retries', async () => {
    const retry = deferred<ReturnType<typeof searchPageEnvelope>>()
    vi.mocked(fetchSearchPage)
      .mockRejectedValueOnce(new CatalogApiError('CATALOG_UNAVAILABLE'))
      .mockImplementationOnce(() => retry.promise)
    const user = userEvent.setup()
    await renderResults()

    const retryButton = await screen.findByRole('button', { name: 'Try again' })
    await user.click(retryButton)
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    retry.resolve(firstSearchPage())
    expect(
      await screen.findByRole('list', { name: 'Search results for the matrix' })
    ).toBeInTheDocument()
  })

  it('keeps previously loaded results labeled cached when a refresh fails', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValueOnce(firstSearchPage())
    const { createTestQueryClient } = await import('@/test/catalogTestUtils')
    const queryClient = createTestQueryClient()
    await renderResults({ queryClient })
    await screen.findByRole('list', { name: 'Search results for the matrix' })

    vi.mocked(fetchSearchPage).mockRejectedValue(new CatalogApiError('CATALOG_UNAVAILABLE'))
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: catalogKeys.search('the matrix', 'en') })
    })

    await waitFor(() => expect(screen.getByText(/Cached results from/)).toBeInTheDocument())
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Search is temporarily unavailable' })).toBeNull()
  })

  it('no longer presents a previous query retry once the query changes', async () => {
    const Harness = () => {
      const [identity, setIdentity] = useState<'alpha' | 'beta'>('alpha')
      return (
        <div>
          <button type="button" onClick={() => setIdentity('beta')}>
            beta
          </button>
          <SearchResults query={buildSearchQuery(identity)} language="en" />
        </div>
      )
    }
    vi.mocked(fetchSearchPage).mockImplementation(({ query }) =>
      query === 'alpha'
        ? Promise.reject(new CatalogApiError('CATALOG_UNAVAILABLE'))
        : Promise.resolve(firstSearchPage())
    )
    const user = userEvent.setup()
    await renderWithProviders(<Harness />)

    expect(
      await screen.findByRole('heading', { name: 'Search is temporarily unavailable' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'beta' }))
    expect(await screen.findByRole('heading', { name: 'Results for “beta”' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Search is temporarily unavailable' })).toBeNull()
  })
})
