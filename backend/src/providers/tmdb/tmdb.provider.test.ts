import { describe, expect, it, vi } from 'vitest'

import type { TmdbClient } from './tmdb.client.js'
import { ProviderHttpError } from './tmdb.errors.js'
import { createTmdbProvider } from './tmdb.provider.js'

const moviePage = {
  page: 1,
  results: [
    {
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
      release_date: '1999-10-15',
      poster_path: '/fight-club.jpg',
      adult: false,
      vote_average: 8.4,
      vote_count: 100,
      genre_ids: [18],
    },
  ],
  total_pages: 10,
  total_results: 200,
}

const tvPage = {
  page: 1,
  results: [
    {
      id: 1399,
      name: 'Example Show',
      original_name: 'Example Show',
      first_air_date: '2011-04-17',
      poster_path: null,
      adult: false,
      vote_average: 9,
      vote_count: 100,
      genre_ids: [],
    },
  ],
  total_pages: 5,
}

const createProvider = (request: TmdbClient['request']) => {
  const client: TmdbClient = { request }
  return createTmdbProvider({
    client,
    images: {
      ensureReady: async () => undefined,
      resolvePoster: (path) =>
        path ? { url: `https://image.example.test/w342${path}` } : undefined,
      resolveBackdrop: (path) =>
        path ? { url: `https://image.example.test/w780${path}` } : undefined,
      resolveProfile: (path) =>
        path ? { url: `https://image.example.test/w185${path}` } : undefined,
      resolveStill: (path) =>
        path ? { url: `https://image.example.test/w300${path}` } : undefined,
      resolveProviderLogo: (path) =>
        path ? { url: `https://image.example.test/w92${path}` } : undefined,
    },
    genres: {
      getGenreNames: async () => new Map([[18, 'Drama']]),
    },
  })
}

describe('tmdb provider', () => {
  it('declares capabilities', async () => {
    const provider = createProvider(vi.fn() as unknown as TmdbClient['request'])
    await expect(provider.capabilities()).resolves.toHaveLength(3)
  })

  it('uses the weekly trending window without a page parameter and forces page 1', async () => {
    const request = vi.fn(async () => moviePage) as unknown as TmdbClient['request']
    const provider = createProvider(request)

    const page = await provider.fetchSectionPage({
      mediaType: 'movie',
      section: 'trending',
      language: 'en-US',
      page: 7,
    })

    expect(request).toHaveBeenCalledWith(
      '/trending/movie/week',
      { language: 'en-US' },
      expect.anything()
    )
    expect(page.page).toBe(1)
    expect(page.items[0]?.title).toBe('Fight Club')
  })

  it('passes the requested page for popular and top-rated categories', async () => {
    const request = vi.fn(async () => moviePage) as unknown as TmdbClient['request']
    const provider = createProvider(request)

    await provider.fetchSectionPage({
      mediaType: 'movie',
      section: 'popular',
      language: 'es-ES',
      page: 3,
    })
    await provider.fetchSectionPage({
      mediaType: 'movie',
      section: 'top-rated',
      language: 'es-ES',
      page: 2,
    })

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/movie/popular',
      { language: 'es-ES', page: 3 },
      expect.anything()
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/movie/top_rated',
      { language: 'es-ES', page: 2 },
      expect.anything()
    )
  })

  it('uses TV endpoints and returns total metadata', async () => {
    const request = vi.fn(async () => tvPage) as unknown as TmdbClient['request']
    const provider = createProvider(request)

    const page = await provider.fetchSectionPage({
      mediaType: 'tv',
      section: 'popular',
      language: 'en-US',
      page: 1,
    })

    expect(request).toHaveBeenCalledWith(
      '/tv/popular',
      { language: 'en-US', page: 1 },
      expect.anything()
    )
    expect(page.totalPages).toBe(5)
    expect(page.totalResults).toBeUndefined()
    expect(page.items[0]?.mediaType).toBe('tv')
  })

  it('fetches movie and TV detail records and maps card fields', async () => {
    const request = vi.fn(async (path: string) => {
      if (path === '/movie/550') {
        return {
          ...moviePage.results[0],
          genres: [{ id: 18, name: 'Drama' }],
        }
      }
      return {
        id: 1399,
        name: 'Example Show',
        original_name: 'Example Show',
        first_air_date: '2011-04-17',
        genres: [],
      }
    }) as unknown as TmdbClient['request']

    const provider = createProvider(request)

    const movie = await provider.fetchItem({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })
    const tv = await provider.fetchItem({ mediaType: 'tv', providerId: 1399, language: 'en-US' })

    expect(movie?.title).toBe('Fight Club')
    expect(movie?.genres).toEqual([{ id: '18', name: 'Drama' }])
    expect(tv?.title).toBe('Example Show')
    expect(request).toHaveBeenCalledWith('/movie/550', { language: 'en-US' }, expect.anything())
    expect(request).toHaveBeenCalledWith('/tv/1399', { language: 'en-US' }, expect.anything())
  })

  it('returns null for a provider 404 detail response', async () => {
    const request = vi.fn(async () => {
      throw new ProviderHttpError(404)
    }) as unknown as TmdbClient['request']
    const provider = createProvider(request)

    await expect(
      provider.fetchItem({ mediaType: 'movie', providerId: 1, language: 'en-US' })
    ).resolves.toBeNull()
  })

  it('propagates other detail failures', async () => {
    const request = vi.fn(async () => {
      throw new ProviderHttpError(500)
    }) as unknown as TmdbClient['request']
    const provider = createProvider(request)

    await expect(
      provider.fetchItem({ mediaType: 'movie', providerId: 1, language: 'en-US' })
    ).rejects.toBeInstanceOf(ProviderHttpError)
  })
})
