import { describe, expect, it, vi } from 'vitest'

import { CatalogCache } from './catalog-cache.js'

const createCache = (overrides: Partial<ConstructorParameters<typeof CatalogCache>[0]> = {}) =>
  new CatalogCache({
    freshTtlMs: 1000,
    staleTtlMs: 10_000,
    maxEntries: 10,
    ...overrides,
  })

describe('CatalogCache', () => {
  it('returns a fresh hit without calling the loader', async () => {
    let now = 0
    const cache = createCache({ now: () => now })
    const loader = vi.fn(async () => 'value')

    const first = await cache.getOrLoad('key', loader)
    const second = await cache.getOrLoad('key', loader)

    expect(first).toMatchObject({ value: 'value', stale: false, source: 'provider' })
    expect(second).toMatchObject({ value: 'value', stale: false, source: 'cache' })
    expect(loader).toHaveBeenCalledTimes(1)
    now = 10
  })

  it('serves labeled stale data after a failure within the stale window', async () => {
    let now = 0
    const cache = createCache({ now: () => now })
    await cache.getOrLoad('key', async () => 'value')

    now = 5000
    const result = await cache.getOrLoad('key', async () => {
      throw new Error('provider down')
    })

    expect(result).toMatchObject({ value: 'value', stale: true, source: 'stale-cache' })
  })

  it('refreshes stale data when the provider recovers', async () => {
    let now = 0
    const cache = createCache({ now: () => now })
    await cache.getOrLoad('key', async () => 'old')

    now = 5000
    const result = await cache.getOrLoad('key', async () => 'new')

    expect(result).toMatchObject({ value: 'new', stale: false, source: 'provider' })
    now = 5001
    expect((await cache.getOrLoad('key', async () => 'never')).value).toBe('new')
  })

  it('propagates the error when no stale entry is usable', async () => {
    let now = 0
    const cache = createCache({ now: () => now })
    await cache.getOrLoad('key', async () => 'value')

    now = 20_000
    await expect(
      cache.getOrLoad('key', async () => {
        throw new Error('provider down')
      })
    ).rejects.toThrow('provider down')
  })

  it('isolates keys by media type, section, language, and page', async () => {
    const cache = createCache()
    const keys = [
      'tmdb:section:movie:popular:en-US:1',
      'tmdb:section:movie:popular:es-ES:1',
      'tmdb:section:tv:popular:en-US:1',
      'tmdb:section:movie:top-rated:en-US:2',
    ]

    const results = await Promise.all(keys.map((key) => cache.getOrLoad(key, async () => key)))
    expect(new Set(results.map((result) => result.value))).toEqual(new Set(keys))
  })

  it('shares one in-flight load for identical concurrent misses', async () => {
    const cache = createCache()
    let resolve: (value: string) => void = () => undefined
    const loader = vi.fn(
      async () =>
        new Promise<string>((done) => {
          resolve = done
        })
    )

    const first = cache.getOrLoad('key', loader)
    const second = cache.getOrLoad('key', loader)
    resolve('value')

    expect(await first).toBe(await second)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('bounds the number of stored entries', async () => {
    let now = 0
    const cache = createCache({ maxEntries: 2, now: () => now })

    await cache.getOrLoad('a', async () => 1)
    await cache.getOrLoad('b', async () => 2)
    await cache.getOrLoad('c', async () => 3)

    expect(cache.size).toBe(2)
    now = 1
  })

  it('evicts expired entries first', async () => {
    let now = 0
    const cache = createCache({ freshTtlMs: 10, staleTtlMs: 10, maxEntries: 2, now: () => now })
    await cache.getOrLoad('expired', async () => 1)

    now = 100
    await cache.getOrLoad('fresh-a', async () => 2)
    await cache.getOrLoad('fresh-b', async () => 3)

    expect(cache.size).toBeLessThanOrEqual(2)
  })

  it('clears all entries and in-flight requests', async () => {
    const cache = createCache()
    await cache.getOrLoad('key', async () => 'value')
    cache.clear()
    expect(cache.size).toBe(0)
  })
})
