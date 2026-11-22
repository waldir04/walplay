import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

import type { TmdbClient } from './tmdb.client.js'
import { createImageResolver } from './tmdb.images.js'

const fakeClient = (request: TmdbClient['request']): TmdbClient => ({ request })

describe('image resolver', () => {
  it('composes approved grid and large poster URLs from configuration', async () => {
    const request = vi.fn(async () => ({
      images: {
        secure_base_url: 'https://image.example.test/t/p/',
        poster_sizes: ['w342', 'w780'],
      },
    }))
    const resolver = createImageResolver(fakeClient(request as unknown as TmdbClient['request']), {
      ttlMs: 1000,
    })

    await resolver.ensureReady()

    expect(resolver.resolvePoster('/poster.jpg')).toEqual({
      url: 'https://image.example.test/t/p/w342/poster.jpg',
      urlLarge: 'https://image.example.test/t/p/w780/poster.jpg',
    })
  })

  it('omits artwork when the path is empty or unavailable', async () => {
    const request = vi.fn(async () => ({
      images: { secure_base_url: 'https://image.example.test/t/p/', poster_sizes: [] },
    }))
    const resolver = createImageResolver(fakeClient(request as unknown as TmdbClient['request']), {
      ttlMs: 1000,
    })
    await resolver.ensureReady()

    expect(resolver.resolvePoster(null)).toBeUndefined()
    expect(resolver.resolvePoster('')).toBeUndefined()
    expect(resolver.resolvePoster('   ')).toBeUndefined()
  })

  it('omits artwork when configuration fails rather than failing the request', async () => {
    const request = vi.fn(async () => {
      throw new Error('configuration unavailable')
    })
    const resolver = createImageResolver(fakeClient(request as unknown as TmdbClient['request']), {
      ttlMs: 1000,
    })

    await expect(resolver.ensureReady()).resolves.toBeUndefined()
    expect(resolver.resolvePoster('/poster.jpg')).toBeUndefined()
  })

  it('refreshes configuration after the TTL', async () => {
    let now = 0
    const request = vi.fn(async () => ({
      images: { secure_base_url: `https://image${now}.example.test/t/p/`, poster_sizes: [] },
    }))
    const resolver = createImageResolver(fakeClient(request as unknown as TmdbClient['request']), {
      ttlMs: 10,
      now: () => now,
    })

    await resolver.ensureReady()
    now = 20
    await resolver.ensureReady()

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('parses configuration with the documented schema', async () => {
    const request = vi.fn(async (_path: string, _params: unknown, schema: z.ZodType) => {
      const parsed = schema.safeParse({
        images: { secure_base_url: 'https://image.example.test/t/p/', poster_sizes: ['w342'] },
      })
      return parsed.success ? parsed.data : null
    })
    const resolver = createImageResolver(fakeClient(request as unknown as TmdbClient['request']), {
      ttlMs: 1000,
    })
    await resolver.ensureReady()
    expect(resolver.resolvePoster('/x.jpg')?.url).toContain('/w342/x.jpg')
  })
})
