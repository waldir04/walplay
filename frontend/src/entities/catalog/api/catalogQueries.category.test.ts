import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { movieItem, pageEnvelope, secondMovieItem } from '@/test/fixtures/catalog'

import { useCategoryQuery } from './catalogQueries'

vi.mock('./catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchSectionPage } = await import('./catalogClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchSectionPage).mockReset()
})

describe('category infinite query foundation', () => {
  it('starts at page one and derives the next page from hasMore', async () => {
    vi.mocked(fetchSectionPage)
      .mockResolvedValueOnce(pageEnvelope({ items: [movieItem()], page: 1, hasMore: true }))
      .mockResolvedValueOnce(pageEnvelope({ items: [secondMovieItem()], page: 2, hasMore: false }))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCategoryQuery('movie', 'popular', 'en'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSectionPage).toHaveBeenNthCalledWith(1, {
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 1,
    })

    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
    expect(result.current.hasNextPage).toBe(true)
    await result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(fetchSectionPage).toHaveBeenNthCalledWith(2, {
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 2,
    })
    expect(result.current.hasNextPage).toBe(false)
  })

  it('does not request a next page when hasMore is false', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(
      pageEnvelope({ items: [movieItem()], page: 1, hasMore: false })
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCategoryQuery('movie', 'top-rated', 'es'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
    expect(fetchSectionPage).toHaveBeenCalledTimes(1)
  })
})
