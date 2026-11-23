import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import {
  MOVIE_ID,
  TV_ID,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
} from '@/test/fixtures/detail'
import { secondMovieItem } from '@/test/fixtures/catalog'

import {
  useCollectionQuery,
  useCreditsQuery,
  useDetailQuery,
  useSeasonQuery,
  useSimilarQuery,
} from './detailQueries'
import { catalogKeys } from './catalogKeys'

vi.mock('./detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

const { fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar } =
  await import('./detailClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  for (const mock of [fetchCollection, fetchCredits, fetchDetail, fetchSeason, fetchSimilar]) {
    vi.mocked(mock).mockReset()
  }
})

describe('detail queries', () => {
  it('loads the core detail with a language-aware key', async () => {
    vi.mocked(fetchDetail).mockResolvedValue(detailEnvelope())
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useDetailQuery('movie', MOVIE_ID, 'es'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchDetail).toHaveBeenCalledWith({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      language: 'es',
    })
    expect(client.getQueryData(catalogKeys.detail('movie', MOVIE_ID, 'es'))).toBeDefined()
  })

  it('does not request the core detail when disabled', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useDetailQuery('movie', MOVIE_ID, 'en', { enabled: false }),
      { wrapper }
    )
    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchDetail).not.toHaveBeenCalled()
  })

  it('loads secondary surfaces only when enabled', async () => {
    vi.mocked(fetchCredits).mockResolvedValue(creditsEnvelope())
    vi.mocked(fetchSimilar).mockResolvedValue({
      data: { items: [secondMovieItem()] },
      meta: creditsEnvelope().meta,
    })
    const { wrapper } = createWrapper()

    const disabled = renderHook(
      () => useCreditsQuery('movie', MOVIE_ID, 'en', { enabled: false }),
      { wrapper }
    )
    const enabled = renderHook(() => useCreditsQuery('movie', MOVIE_ID, 'en', { enabled: true }), {
      wrapper,
    })
    const similar = renderHook(() => useSimilarQuery('movie', MOVIE_ID, 'en'), { wrapper })

    await waitFor(() => expect(enabled.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(similar.result.current.isSuccess).toBe(true))
    expect(disabled.result.current.fetchStatus).toBe('idle')
  })

  it('never requests a collection for tv', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCollectionQuery('tv', TV_ID, 'en', { enabled: true }), {
      wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchCollection).not.toHaveBeenCalled()
  })

  it('never requests a season before the season resolves', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSeasonQuery('tv', TV_ID, undefined, 'en', { enabled: true }),
      { wrapper }
    )
    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSeason).not.toHaveBeenCalled()
  })

  it('keys and requests the season with the selected number and language', async () => {
    vi.mocked(fetchSeason).mockResolvedValue(seasonEnvelope(2))
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useSeasonQuery('tv', TV_ID, 2, 'es'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSeason).toHaveBeenCalledWith({
      mediaType: 'tv',
      itemId: TV_ID,
      seasonNumber: 2,
      language: 'es',
    })
    expect(client.getQueryData(catalogKeys.season('tv', TV_ID, 2, 'es'))).toBeDefined()
  })
})
