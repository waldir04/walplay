import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/catalogTestUtils'
import { MOVIE_ID, detailEnvelope, tvDetail } from '@/test/fixtures/detail'

import { useDetailQuery } from './detailQueries'

vi.mock('./detailClient', () => ({
  createDetailClient: vi.fn(),
  getDetailClient: vi.fn(),
  fetchDetail: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchCollection: vi.fn(),
  fetchSeason: vi.fn(),
}))

const { fetchDetail } = await import('./detailClient')

const createWrapper = () => ({
  wrapper: ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: createTestQueryClient() }, children),
})

beforeEach(() => {
  vi.mocked(fetchDetail).mockReset()
})

describe('detail query races', () => {
  it('keeps the newest detail when responses resolve out of order', async () => {
    const secondId = 'd2wxOm1vdmllOjY4MA'
    let resolveFirst: ((value: ReturnType<typeof detailEnvelope>) => void) | undefined
    let resolveSecond: ((value: ReturnType<typeof detailEnvelope>) => void) | undefined

    vi.mocked(fetchDetail).mockImplementation(({ itemId }) =>
      itemId === MOVIE_ID
        ? new Promise((resolve) => {
            resolveFirst = resolve
          })
        : new Promise((resolve) => {
            resolveSecond = resolve
          })
    )

    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ itemId }: { itemId: string }) => useDetailQuery('movie', itemId, 'en'),
      { wrapper, initialProps: { itemId: MOVIE_ID } }
    )

    rerender({ itemId: secondId })
    resolveSecond?.(detailEnvelope(tvDetail({ id: secondId, mediaType: 'movie', title: 'Newest' })))
    await waitFor(() => expect(result.current.data?.data.title).toBe('Newest'))

    resolveFirst?.(detailEnvelope())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.data?.data.title).toBe('Newest')
  })
})
