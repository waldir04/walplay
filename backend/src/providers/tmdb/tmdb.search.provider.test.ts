import { describe, expect, it, vi } from 'vitest'

import type { TmdbClient } from './tmdb.client.js'
import type { ImageResolver } from './tmdb.images.js'
import { createTmdbSearchProvider } from './tmdb.search.provider.js'

const createDeps = () => {
  const request = vi.fn(async (_path: string, _params: Record<string, unknown>, _schema: unknown) => ({
    page: 2,
    results: [
      {
        id: 550,
        media_type: 'movie',
        title: 'Fight Club',
        original_title: 'Fight Club',
        release_date: '1999-10-15',
        genre_ids: [18],
        vote_average: 8.4,
        vote_count: 10,
      },
      { id: 1399, media_type: 'tv', name: 'Example Show', genre_ids: [18] },
      { id: 42, media_type: 'person', name: 'Someone' },
    ],
    total_pages: 25,
    total_results: 500,
  }))
  const getGenreNames = vi.fn(async (mediaType: string) =>
    mediaType === 'movie'
      ? new Map([[18, 'Drama']])
      : new Map([[18, 'Drama TV']])
  )
  const ensureReady = vi.fn(async () => undefined)
  const resolvePoster = vi.fn(() => undefined)

  return {
    request,
    getGenreNames,
    ensureReady,
    resolvePoster,
    dependencies: {
      client: { request } as unknown as TmdbClient,
      genres: { getGenreNames },
      images: { ensureReady, resolvePoster } as unknown as ImageResolver,
    },
  }
}

describe('TMDB search provider', () => {
  it('calls exactly the unified multi-search operation with only allowed parameters', async () => {
    const deps = createDeps()
    const provider = createTmdbSearchProvider(deps.dependencies)

    await provider.fetchSearchPage({ query: 'fight club', language: 'en-US', page: 2 })

    expect(deps.request).toHaveBeenCalledTimes(1)
    const [path, params] = deps.request.mock.calls[0] ?? []
    expect(path).toBe('/search/multi')
    expect(params).toEqual({
      query: 'fight club',
      language: 'en-US',
      page: 2,
      include_adult: 'false',
    })
    for (const forbidden of ['region', 'year', 'genre', 'sort_by', 'with_genres', 'media_type']) {
      expect(params).not.toHaveProperty(forbidden)
    }
  })

  it('resolves movie and TV genre maps in parallel for the selected language and shares the client', async () => {
    const deps = createDeps()
    const provider = createTmdbSearchProvider(deps.dependencies)

    await provider.fetchSearchPage({ query: 'matrix', language: 'es-ES', page: 1 })

    expect(deps.getGenreNames).toHaveBeenCalledWith('movie', 'es-ES')
    expect(deps.getGenreNames).toHaveBeenCalledWith('tv', 'es-ES')
    expect(deps.ensureReady).toHaveBeenCalledTimes(1)
  })

  it('maps to a provider-neutral page with items and only totalPages metadata', async () => {
    const deps = createDeps()
    const provider = createTmdbSearchProvider(deps.dependencies)

    const page = await provider.fetchSearchPage({ query: 'fight club', language: 'en-US', page: 2 })

    expect(page.page).toBe(2)
    expect(page.totalPages).toBe(25)
    expect(page.items).toHaveLength(2)
    expect(page).not.toHaveProperty('totalResults')
    expect(page.items.map((item) => item.mediaType)).toEqual(['movie', 'tv'])
  })
})
