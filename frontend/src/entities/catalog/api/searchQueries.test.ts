import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { firstSearchPage, secondSearchPage } from '@/test/fixtures/catalog/search'

import { buildSearchQuery } from '../model/searchQuery'
import { catalogKeys } from './catalogKeys'
import { CATALOG_GC_TIME_MS, CATALOG_STALE_TIME_MS } from './catalogQueries'
import { useSearchQuery } from './searchQueries'

vi.mock('./catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
  fetchSearchPage: vi.fn(),
}))

const { fetchSearchPage } = await import('./catalogClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchSearchPage).mockReset()
})

describe('useSearchQuery', () => {
  it('starts at page one and derives the next page from data.page only when hasMore', async () => {
    vi.mocked(fetchSearchPage)
      .mockResolvedValueOnce(firstSearchPage())
      .mockResolvedValueOnce(secondSearchPage())
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearchQuery(buildSearchQuery('the matrix'), 'en'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSearchPage).toHaveBeenNthCalledWith(1, {
      query: 'the matrix',
      language: 'en',
      page: 1,
    })
    expect(result.current.hasNextPage).toBe(true)

    await result.current.fetchNextPage()
    await waitFor(() => expect(fetchSearchPage).toHaveBeenCalledTimes(2))
    expect(fetchSearchPage).toHaveBeenNthCalledWith(2, {
      query: 'the matrix',
      language: 'en',
      page: 2,
    })
  })

  it('keys results by normalized identity and language', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(firstSearchPage())
    const { client, wrapper } = createWrapper()
    const { result } = renderHook(() => useSearchQuery(buildSearchQuery('  THE   Matrix '), 'en'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(catalogKeys.search('the matrix', 'en'))).toBeDefined()
    expect(client.getQueryData(catalogKeys.search('the matrix', 'es'))).toBeUndefined()
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query: 'THE   Matrix',
      language: 'en',
      page: 1,
    })
  })

  it('does not request an invalid query', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearchQuery(buildSearchQuery('a'), 'en'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(fetchSearchPage).not.toHaveBeenCalled()
  })

  it('disables retries and background refetches and uses the catalog stale times', async () => {
    vi.mocked(fetchSearchPage).mockRejectedValue(new Error('offline'))
    const { client, wrapper } = createWrapper()
    const { result } = renderHook(() => useSearchQuery(buildSearchQuery('the matrix'), 'en'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchSearchPage).toHaveBeenCalledTimes(1)

    const query = client.getQueryCache().find({
      queryKey: catalogKeys.search('the matrix', 'en'),
    })
    const options = query?.options as unknown as Record<string, unknown>
    expect(options.retry).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
    expect(options.refetchOnReconnect).toBe(false)
    expect(options.staleTime).toBe(CATALOG_STALE_TIME_MS)
    expect(options.gcTime).toBe(CATALOG_GC_TIME_MS)
  })

  it('never reuses another key as placeholder data', async () => {
    let resolvePage: ((value: ReturnType<typeof firstSearchPage>) => void) | undefined
    vi.mocked(fetchSearchPage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve
        })
    )
    const { client, wrapper } = createWrapper()
    client.setQueryData(catalogKeys.search('other', 'en'), firstSearchPage())

    const { result } = renderHook(() => useSearchQuery(buildSearchQuery('the matrix'), 'en'), {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
    resolvePage?.(firstSearchPage())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('does not surface a superseded key response in the current render', async () => {
    const resolvers = new Map<string, (value: ReturnType<typeof firstSearchPage>) => void>()
    vi.mocked(fetchSearchPage).mockImplementation(
      ({ query }) =>
        new Promise((resolve) => {
          resolvers.set(query, resolve)
        })
    )
    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ query }) => useSearchQuery(buildSearchQuery(query), 'en'),
      { wrapper, initialProps: { query: 'alpha' } }
    )

    await waitFor(() => expect(resolvers.has('alpha')).toBe(true))
    rerender({ query: 'beta' })
    await waitFor(() => expect(resolvers.has('beta')).toBe(true))

    resolvers.get('alpha')?.(firstSearchPage())
    await waitFor(() => expect(result.current.isFetching).toBe(true))

    resolvers.get('beta')?.(secondSearchPage())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.data.items[0]?.title).toBe('The Matrix Reloaded')
  })
})
