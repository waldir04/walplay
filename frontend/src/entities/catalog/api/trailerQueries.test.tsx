import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { MOVIE_ID, TV_ID } from '@/test/fixtures/catalog'
import { availableTrailerEnvelope } from '@/test/fixtures/trailer'

import { catalogKeys } from './catalogKeys'
import { fetchTrailers } from './trailerClient'
import { TRAILER_GC_TIME_MS, TRAILER_STALE_TIME_MS, useTrailerQuery } from './trailerQueries'

vi.mock('./trailerClient', () => ({
  fetchTrailers: vi.fn(),
}))

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchTrailers).mockReset()
})

describe('trailer query', () => {
  it('uses a dedicated long-lived, non-retrying query key without language', async () => {
    vi.mocked(fetchTrailers).mockResolvedValue(availableTrailerEnvelope())
    const { wrapper, client } = createWrapper()

    const { result } = renderHook(() => useTrailerQuery('movie', MOVIE_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchTrailers).toHaveBeenCalledWith({ mediaType: 'movie', itemId: MOVIE_ID })
    expect(catalogKeys.trailers('movie', MOVIE_ID)).toEqual([
      'catalog',
      'trailers',
      'movie',
      MOVIE_ID,
    ])
    expect(catalogKeys.trailers('movie', MOVIE_ID)).not.toContain('en')
    expect(TRAILER_STALE_TIME_MS).toBe(86_400_000)
    expect(TRAILER_GC_TIME_MS).toBe(604_800_000)
    expect(client.getQueryData(catalogKeys.trailers('movie', MOVIE_ID))).toBeDefined()
  })

  it('keeps separate caches per title and media type', async () => {
    vi.mocked(fetchTrailers).mockResolvedValue(availableTrailerEnvelope())
    const { wrapper, client } = createWrapper()

    const movie = renderHook(() => useTrailerQuery('movie', MOVIE_ID), { wrapper })
    const tv = renderHook(() => useTrailerQuery('tv', TV_ID), { wrapper })

    await waitFor(() => expect(movie.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(tv.result.current.isSuccess).toBe(true))

    expect(client.getQueryData(catalogKeys.trailers('movie', MOVIE_ID))).toBeDefined()
    expect(client.getQueryData(catalogKeys.trailers('tv', TV_ID))).toBeDefined()
  })

  it('stays disabled when the capability gate is closed', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTrailerQuery('movie', MOVIE_ID, { enabled: false }), {
      wrapper,
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchTrailers).not.toHaveBeenCalled()
  })
})
