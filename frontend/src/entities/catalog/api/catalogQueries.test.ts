import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { pageEnvelope, movieItem, secondMovieItem } from '@/test/fixtures/catalog'

import {
  flattenCatalogPages,
  useCapabilitiesQuery,
  useSectionPreviewQuery,
  CATALOG_STALE_TIME_MS,
} from './catalogQueries'

vi.mock('./catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchCapabilities, fetchSectionPage } = await import('./catalogClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchCapabilities).mockReset()
  vi.mocked(fetchSectionPage).mockReset()
})

describe('catalog query helpers', () => {
  it('flattens pages in provider order and removes duplicates', () => {
    const first = pageEnvelope({ items: [movieItem(), secondMovieItem()], page: 1 })
    const second = pageEnvelope({
      items: [secondMovieItem(), movieItem({ id: 'd2wxOm1vdmllOjQ1Ng' })],
      page: 2,
    })

    const result = flattenCatalogPages([first, second])

    expect(result.items.map((item) => item.id)).toEqual([
      movieItem().id,
      secondMovieItem().id,
      'd2wxOm1vdmllOjQ1Ng',
    ])
    expect(result.duplicates).toBe(1)
  })

  it('handles no pages', () => {
    expect(flattenCatalogPages([])).toEqual({ items: [], duplicates: 0 })
  })

  it('uses a deliberate five-minute stale time', () => {
    expect(CATALOG_STALE_TIME_MS).toBe(5 * 60 * 1000)
  })

  it('loads capabilities through TanStack Query', async () => {
    vi.mocked(fetchCapabilities).mockResolvedValue({
      data: {
        sections: [{ id: 'trending', order: 1, mediaTypes: ['movie', 'tv'], paginated: false }],
      },
    })
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCapabilitiesQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.sections).toHaveLength(1)
  })

  it('requests the first preview page only', async () => {
    vi.mocked(fetchSectionPage).mockResolvedValue(pageEnvelope({ items: [movieItem()] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSectionPreviewQuery('movie', 'popular', 'en'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSectionPage).toHaveBeenCalledWith({
      mediaType: 'movie',
      section: 'popular',
      language: 'en',
      page: 1,
    })
  })
})
