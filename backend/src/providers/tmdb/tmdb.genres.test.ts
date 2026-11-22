import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

import type { TmdbClient } from './tmdb.client.js'
import { createGenreResolver } from './tmdb.genres.js'

const fakeClient = (request: TmdbClient['request']): TmdbClient => ({ request })

describe('genre resolver', () => {
  it('resolves localized names and caches them per media type and language', async () => {
    const request = vi.fn(async () => ({ genres: [{ id: 18, name: 'Drama' }] }))
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))

    const first = await resolver.getGenreNames('movie', 'en-US')
    const second = await resolver.getGenreNames('movie', 'en-US')

    expect(first.get(18)).toBe('Drama')
    expect(second).toBe(first)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(
      '/genre/movie/list',
      { language: 'en-US' },
      expect.anything()
    )
  })

  it('caches separately per language and media type', async () => {
    const request = vi.fn(async (path: string, params: whatever) => ({
      genres: [{ id: 1, name: `${path}-${String(params.language)}` }],
    }))
    type whatever = { language: string }
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))

    await resolver.getGenreNames('movie', 'en-US')
    await resolver.getGenreNames('movie', 'es-ES')
    await resolver.getGenreNames('tv', 'en-US')

    expect(request).toHaveBeenCalledTimes(3)
  })

  it('degrades to an empty map on provider failure', async () => {
    const request = vi.fn(async () => {
      throw new Error('provider down')
    })
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))

    const names = await resolver.getGenreNames('movie', 'en-US')
    expect(names.size).toBe(0)
  })

  it('omits blank names', async () => {
    const request = vi.fn(async () => ({
      genres: [
        { id: 1, name: '  ' },
        { id: 2, name: 'Comedy' },
      ],
    }))
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))

    const names = await resolver.getGenreNames('movie', 'en-US')
    expect(names.has(1)).toBe(false)
    expect(names.get(2)).toBe('Comedy')
  })

  it('shares one in-flight request for identical keys', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined
    const request = vi.fn(
      async () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        })
    )
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))

    const first = resolver.getGenreNames('movie', 'en-US')
    const second = resolver.getGenreNames('movie', 'en-US')
    resolveRequest({ genres: [{ id: 3, name: 'Action' }] })

    await expect(first).resolves.toBe(await second)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('accepts a schema argument without exposing raw ids', async () => {
    const request = vi.fn(async (_path: string, _params: unknown, schema: z.ZodType) => {
      const parsed = schema.safeParse({ genres: [{ id: 4, name: 'Mystery' }] })
      return parsed.success ? parsed.data : {}
    })
    const resolver = createGenreResolver(fakeClient(request as unknown as TmdbClient['request']))
    const names = await resolver.getGenreNames('movie', 'en-US')
    expect([...names.keys()]).toEqual([4])
  })
})
