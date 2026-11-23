import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

import type { TmdbClient } from './tmdb.client.js'
import { createTmdbDetailProvider } from './tmdb.detail.provider.js'
import { ProviderHttpError } from './tmdb.errors.js'
import {
  completeCollection,
  completeMovieDetail,
  completeSeason,
  completeSimilar,
  completeTvDetail,
  movieCredits,
  originalLanguageOnlyTv,
  tvAggregateCredits,
} from '../../test/fixtures/tmdb/detail.js'

interface RouteResponse {
  readonly [path: string]: unknown
}

const createProvider = (
  responses: RouteResponse,
  failing: Set<string> = new Set()
) => {
  const request = vi.fn(async (path: string, _params: unknown, schema: z.ZodType) => {
    if (failing.has(path)) {
      throw new ProviderHttpError(404)
    }
    const payload = responses[path]
    if (payload === undefined) {
      throw new Error(`Unexpected provider path: ${path}`)
    }
    return schema.parse(payload)
  })

  const images = {
    ensureReady: async () => undefined,
    resolvePoster: (path: string | null | undefined) =>
      path ? { url: `https://image.example.test/w342${path}` } : undefined,
    resolveBackdrop: (path: string | null | undefined) =>
      path ? { url: `https://image.example.test/w780${path}` } : undefined,
    resolveProfile: (path: string | null | undefined) =>
      path ? { url: `https://image.example.test/w185${path}` } : undefined,
    resolveStill: (path: string | null | undefined) =>
      path ? { url: `https://image.example.test/w300${path}` } : undefined,
    resolveProviderLogo: (path: string | null | undefined) =>
      path ? { url: `https://image.example.test/w92${path}` } : undefined,
  }

  const genres = {
    getGenreNames: vi.fn(async () => new Map([[80, 'Crime']])),
  }

  return {
    provider: createTmdbDetailProvider({
      client: { request } as unknown as TmdbClient,
      images,
      genres,
    }),
    request,
    genres,
  }
}

describe('tmdb detail provider', () => {
  it('requests movie detail with only the videos append and maps it', async () => {
    const { provider, request } = createProvider({ '/movie/550': completeMovieDetail() })
    const result = await provider.fetchDetail({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })

    expect(request).toHaveBeenCalledWith(
      '/movie/550',
      { language: 'en-US', append_to_response: 'videos' },
      expect.anything()
    )
    expect(result?.detail.title).toBe('Fight Club')
    expect(request).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ append_to_response: 'credits' }),
      expect.anything()
    )
  })

  it('requests one original-language fallback only when the localized overview is unusable', async () => {
    const responses = {
      '/tv/213': completeTvDetail({ overview: '' }),
    }
    const { provider, request } = createProvider(responses)
    request.mockImplementation(async (path: string, params: unknown, schema: z.ZodType) => {
      if (path === '/tv/213' && (params as { language?: string }).language === 'de') {
        return schema.parse(completeTvDetail({ overview: 'Original overview.' }))
      }
      return schema.parse(responses['/tv/213'])
    })

    const result = await provider.fetchDetail({
      mediaType: 'tv',
      providerId: 213,
      language: 'es-ES',
    })

    expect(request).toHaveBeenCalledTimes(2)
    expect(result?.detail.overview).toBe('Original overview.')
  })

  it('does not request a fallback when the original language matches', async () => {
    const { provider, request } = createProvider({
      '/tv/213': originalLanguageOnlyTv(),
    })
    request.mockImplementation(async (_path: string, _params: unknown, schema: z.ZodType) =>
      schema.parse(completeTvDetail({ overview: '', original_language: 'en' }))
    )

    await provider.fetchDetail({ mediaType: 'tv', providerId: 213, language: 'en-US' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('swallows a failed fallback request', async () => {
    const { provider, request } = createProvider({
      '/tv/213': completeTvDetail({ overview: '' }),
    })
    request.mockImplementation(async (_path: string, params: unknown, schema: z.ZodType) => {
      if ((params as { language?: string }).language === 'de') {
        throw new ProviderHttpError(500)
      }
      return schema.parse(completeTvDetail({ overview: '' }))
    })

    const result = await provider.fetchDetail({
      mediaType: 'tv',
      providerId: 213,
      language: 'es-ES',
    })
    expect(result?.detail).not.toHaveProperty('overview')
  })

  it('maps a provider 404 on detail to null', async () => {
    const { provider } = createProvider({}, new Set(['/movie/404']))
    await expect(
      provider.fetchDetail({ mediaType: 'movie', providerId: 404, language: 'en-US' })
    ).resolves.toBeNull()
  })

  it('uses the movie credits and tv aggregate credits operations', async () => {
    const { provider, request } = createProvider({
      '/movie/550/credits': movieCredits(),
      '/tv/213/aggregate_credits': tvAggregateCredits(),
    })

    const movie = await provider.fetchCredits({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })
    const tv = await provider.fetchCredits({ mediaType: 'tv', providerId: 213, language: 'es-ES' })

    expect(movie.cast[0]?.name).toBe('Edward Norton')
    expect(tv.crew[0]?.name).toBe('Baran bo Odar')
    expect(request.mock.calls.map((call) => call[0])).toEqual([
      '/movie/550/credits',
      '/tv/213/aggregate_credits',
    ])
  })

  it('treats a credits 404 as empty data', async () => {
    const { provider } = createProvider({}, new Set(['/movie/550/credits']))
    await expect(
      provider.fetchCredits({ mediaType: 'movie', providerId: 550, language: 'en-US' })
    ).resolves.toEqual({ cast: [], crew: [] })
  })

  it('requests only the first similar page and treats 404 as empty', async () => {
    const { provider, request } = createProvider({ '/movie/550/similar': completeSimilar() })
    const items = await provider.fetchSimilar({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })
    expect(items.length).toBeGreaterThan(0)
    expect(request).toHaveBeenCalledWith(
      '/movie/550/similar',
      { language: 'en-US', page: 1 },
      expect.anything()
    )

    const empty = createProvider({}, new Set(['/movie/550/similar']))
    await expect(
      empty.provider.fetchSimilar({ mediaType: 'movie', providerId: 550, language: 'en-US' })
    ).resolves.toEqual([])
  })

  it('reads collection parts only through the collection operation', async () => {
    const { provider, request } = createProvider({ '/collection/100': completeCollection() })
    const collection = await provider.fetchCollection({
      providerId: 603,
      language: 'en-US',
      collectionProviderId: 100,
    })
    expect(collection.name).toBe('The Matrix Collection')
    expect(collection.items.map((item) => item.item.title)).toEqual(['The Matrix Reloaded'])
    expect(request).toHaveBeenCalledWith(
      '/collection/100',
      { language: 'en-US' },
      expect.anything()
    )

    const empty = createProvider({}, new Set(['/collection/100']))
    await expect(
      empty.provider.fetchCollection({
        providerId: 603,
        language: 'en-US',
        collectionProviderId: 100,
      })
    ).resolves.toEqual({ items: [] })
  })

  it('requests a season by number and treats 404 as null', async () => {
    const { provider, request } = createProvider({ '/tv/213/season/2': completeSeason() })
    const season = await provider.fetchSeason({
      providerId: 213,
      seasonNumber: 2,
      language: 'es-ES',
    })
    expect(season?.episodes).toHaveLength(3)
    expect(request).toHaveBeenCalledWith(
      '/tv/213/season/2',
      { language: 'es-ES' },
      expect.anything()
    )

    const missing = createProvider({}, new Set(['/tv/213/season/9']))
    await expect(
      missing.provider.fetchSeason({ providerId: 213, seasonNumber: 9, language: 'es-ES' })
    ).resolves.toBeNull()
  })
})

describe('tmdb detail provider errors and edge requests', () => {
  it('rethrows non-404 detail failures', async () => {
    const { provider, request } = createProvider({ '/movie/550': completeMovieDetail() })
    request.mockRejectedValueOnce(new ProviderHttpError(500))
    await expect(
      provider.fetchDetail({ mediaType: 'movie', providerId: 550, language: 'en-US' })
    ).rejects.toMatchObject({ status: 500 })
  })

  it('rethrows non-404 credits, similar, collection, and season failures', async () => {
    const { provider, request } = createProvider({})
    request.mockRejectedValue(new ProviderHttpError(500))
    await expect(
      provider.fetchCredits({ mediaType: 'tv', providerId: 1, language: 'en-US' })
    ).rejects.toMatchObject({ status: 500 })
    await expect(
      provider.fetchSimilar({ mediaType: 'movie', providerId: 1, language: 'en-US' })
    ).rejects.toMatchObject({ status: 500 })
    await expect(
      provider.fetchCollection({ providerId: 1, language: 'en-US', collectionProviderId: 2 })
    ).rejects.toMatchObject({ status: 500 })
    await expect(
      provider.fetchSeason({ providerId: 1, seasonNumber: 1, language: 'en-US' })
    ).rejects.toMatchObject({ status: 500 })
  })

  it('does not make a fallback request when no original language is reported', async () => {
    const { provider, request } = createProvider({
      '/movie/550': completeMovieDetail({ overview: '', original_language: '' }),
    })
    const result = await provider.fetchDetail({
      mediaType: 'movie',
      providerId: 550,
      language: 'es-ES',
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(result?.detail).not.toHaveProperty('overview')
  })
})

