import { describe, expect, it, vi } from 'vitest'

import type { TmdbClient, QueryValue } from './tmdb.client.js'
import { ProviderNetworkError, ProviderHttpError, ProviderValidationError } from './tmdb.errors.js'
import { createTmdbTrailerProvider } from './tmdb.trailer.provider.js'
import { sampleTrailerPayload } from '../../test/fixtures/tmdb/trailers.js'

interface ClientCall {
  readonly path: string
  readonly params: Readonly<Record<string, QueryValue>>
}

const createFakeClient = (result: () => unknown): { client: TmdbClient; calls: ClientCall[] } => {
  const calls: ClientCall[] = []
  const request = vi.fn(async (path: string, params: Readonly<Record<string, QueryValue>>) => {
    calls.push({ path, params })
    return result()
  })
  return { client: { request } as unknown as TmdbClient, calls }
}

const provider = (client: TmdbClient) =>
  createTmdbTrailerProvider({
    client,
    embedHosts: ['www.youtube-nocookie.com'],
    externalHosts: ['www.youtube.com'],
    now: () => Date.parse('2026-11-24T12:00:00.000Z'),
  })

describe('tmdb trailer provider', () => {
  it('requests the movie videos operation without language parameters', async () => {
    const { client, calls } = createFakeClient(() => sampleTrailerPayload())
    const result = await provider(client).fetchTrailers({ mediaType: 'movie', providerId: 550 })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/movie/550/videos')
    expect(calls[0]?.params).toEqual({})
    expect(JSON.stringify(calls[0]?.params)).not.toContain('language')
    expect(JSON.stringify(calls[0]?.params)).not.toContain('include_video_language')
    expect(result?.videos.length).toBeGreaterThan(0)
  })

  it('requests the tv videos operation', async () => {
    const { client, calls } = createFakeClient(() => ({ id: 1399, results: [] }))
    await provider(client).fetchTrailers({ mediaType: 'tv', providerId: 1399 })

    expect(calls[0]?.path).toBe('/tv/1399/videos')
  })

  it('maps null results to an empty inventory', async () => {
    const { client } = createFakeClient(() => ({ id: 550, results: null }))
    await expect(
      provider(client).fetchTrailers({ mediaType: 'movie', providerId: 550 })
    ).resolves.toEqual({ videos: [] })
  })

  it('maps a provider 404 to null', async () => {
    const { client } = createFakeClient(() => {
      throw new ProviderHttpError(404)
    })
    await expect(
      provider(client).fetchTrailers({ mediaType: 'movie', providerId: 999_999 })
    ).resolves.toBeNull()
  })

  it('propagates provider failures for the service to map', async () => {
    const validation = createFakeClient(() => {
      throw new ProviderValidationError()
    })
    await expect(
      provider(validation.client).fetchTrailers({ mediaType: 'movie', providerId: 550 })
    ).rejects.toBeInstanceOf(ProviderValidationError)

    const network = createFakeClient(() => {
      throw new ProviderNetworkError()
    })
    await expect(
      provider(network.client).fetchTrailers({ mediaType: 'movie', providerId: 550 })
    ).rejects.toBeInstanceOf(ProviderNetworkError)
  })
})
