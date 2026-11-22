import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { MOVIE_ID, movieItem } from '@/test/fixtures/catalog'

import { useCatalogItemQuery } from './catalogQueries'

vi.mock('./catalogClient', () => ({
  createCatalogClient: vi.fn(),
  getCatalogClient: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchSectionPage: vi.fn(),
  fetchItem: vi.fn(),
}))

const { fetchItem } = await import('./catalogClient')

const createWrapper = () => {
  const client = createTestQueryClient()
  return {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  }
}

beforeEach(() => {
  vi.mocked(fetchItem).mockReset()
})

describe('useCatalogItemQuery', () => {
  it('requests the minimal detail with a language-aware key', async () => {
    vi.mocked(fetchItem).mockResolvedValue({
      data: movieItem(),
      meta: {
        language: 'es-ES',
        stale: false,
        lastUpdatedAt: '2026-11-22T15:00:00.000Z',
        source: 'provider',
      },
    })
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCatalogItemQuery('movie', MOVIE_ID, 'es'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchItem).toHaveBeenCalledWith({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      language: 'es',
    })
  })

  it('can be disabled when the validated router state already supplies the item', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () => useCatalogItemQuery('movie', MOVIE_ID, 'en', { enabled: false }),
      { wrapper }
    )
    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchItem).not.toHaveBeenCalled()
  })
})
