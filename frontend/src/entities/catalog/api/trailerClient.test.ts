import { describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@/shared/api/httpClient'
import { availableTrailerEnvelope, noVideosTrailerEnvelope } from '@/test/fixtures/trailer'

import { createTrailerClient } from './trailerClient'

const createHttp = (body: unknown) => {
  const get = vi.fn<
    (path: string, schema: unknown) => Promise<{ body: unknown; requestId: string }>
  >(async () => ({ body, requestId: 'request-1' }))
  return { http: { get } as unknown as HttpClient, get }
}

describe('trailer client', () => {
  it('requests the inventory path without a language parameter', async () => {
    const { http, get } = createHttp(availableTrailerEnvelope())

    const result = await createTrailerClient(http).getTrailers({
      mediaType: 'movie',
      itemId: 'item_12345',
    })

    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]?.[0]).toBe('/api/catalog/movie/titles/item_12345/videos')
    expect(get.mock.calls[0]?.[0]).not.toContain('language')
    expect(result.data.state).toBe('available')
  })

  it('encodes the opaque item identifier', async () => {
    const { http, get } = createHttp(noVideosTrailerEnvelope())

    await createTrailerClient(http).getTrailers({
      mediaType: 'tv',
      itemId: 'a/b+c',
    })

    expect(get.mock.calls[0]?.[0]).toBe('/api/catalog/tv/titles/a%2Fb%2Bc/videos')
  })

  it('returns the no-videos envelope', async () => {
    const { http } = createHttp(noVideosTrailerEnvelope())
    const result = await createTrailerClient(http).getTrailers({
      mediaType: 'movie',
      itemId: 'item_12345',
    })

    expect(result.data).toEqual({ state: 'no-videos', videos: [] })
  })
})

describe('trailer client singleton', () => {
  it('fetches through the shared HTTP client and reuses it', async () => {
    const { fetchTrailers, getTrailerClient } = await import('./trailerClient')
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(availableTrailerEnvelope()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchTrailers({ mediaType: 'movie', itemId: 'item_12345' })
    const second = await fetchTrailers({ mediaType: 'movie', itemId: 'item_12345' })

    expect(first.data.state).toBe('available')
    expect(second.data.state).toBe('available')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getTrailerClient()).toBe(getTrailerClient())
  })
})
