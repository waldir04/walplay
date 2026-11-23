import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { firstSearchPage, secondSearchPage } from '@/test/fixtures/catalog/search'

import { buildSearchQuery } from '../model/searchQuery'
import { catalogKeys } from './catalogKeys'
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

describe('search query race isolation', () => {
  it('keeps one key per identity and language and never surfaces another key’s pages', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(firstSearchPage())
    const { client, wrapper } = createWrapper()
    const matrixKey = catalogKeys.search('the matrix', 'en')
    client.setQueryData(matrixKey, {
      pages: [firstSearchPage(), secondSearchPage()],
      pageParams: [1, 2],
    })

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useSearchQuery(buildSearchQuery(query), 'en'),
      { wrapper, initialProps: { query: 'the matrix' } }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages).toHaveLength(2)

    rerender({ query: 'arrival' })
    await waitFor(() =>
      expect(result.current.data?.pages[0]?.data.items[0]?.title).toBe('The Matrix')
    )
    expect(result.current.data?.pages).toHaveLength(1)

    const arrivalKey = catalogKeys.search('arrival', 'en')
    expect(matrixKey).not.toEqual(arrivalKey)
    const matrixPages = client.getQueryData<{ pages: unknown[] }>(matrixKey)
    expect(matrixPages?.pages).toHaveLength(2)
  })

  it('confines a late superseded response to its own key', async () => {
    let resolveMatrix: ((value: ReturnType<typeof firstSearchPage>) => void) | undefined
    vi.mocked(fetchSearchPage).mockImplementation(({ query }) => {
      if (query === 'the matrix') {
        return new Promise((resolve) => {
          resolveMatrix = resolve
        })
      }
      return Promise.resolve(firstSearchPage())
    })
    const { client, wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useSearchQuery(buildSearchQuery(query), 'en'),
      { wrapper, initialProps: { query: 'the matrix' } }
    )

    rerender({ query: 'arrival' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    resolveMatrix?.(firstSearchPage())
    await waitFor(() =>
      expect(client.getQueryData(catalogKeys.search('the matrix', 'en'))).toBeDefined()
    )

    expect(result.current.data?.pages).toHaveLength(1)
    expect(result.current.isSuccess).toBe(true)
  })

  it('does not reuse prior pages when the language changes', async () => {
    vi.mocked(fetchSearchPage).mockResolvedValue(firstSearchPage())
    const { client, wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ language }: { language: 'en' | 'es' }) =>
        useSearchQuery(buildSearchQuery('the matrix'), language),
      { wrapper, initialProps: { language: 'en' } }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ language: 'es' })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(client.getQueryData(catalogKeys.search('the matrix', 'en'))).toBeDefined()
    expect(client.getQueryData(catalogKeys.search('the matrix', 'es'))).toBeDefined()
    expect(fetchSearchPage).toHaveBeenCalledWith({
      query: 'the matrix',
      language: 'es',
      page: 1,
    })
  })
})
