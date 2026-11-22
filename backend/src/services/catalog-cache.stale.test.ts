import { describe, expect, it, vi } from 'vitest'

import { CatalogCache } from './catalog-cache.js'

const build = (now: () => number, maxEntries = 10) =>
  new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries, now })

describe('catalog cache behavior', () => {
  it('serves a fresh hit without provider traffic', async () => {
    const now = 0
    const cache = build(() => now)
    const loader = vi.fn(async () => 'value')

    await cache.getOrLoad('key', loader)
    const result = await cache.getOrLoad('key', loader)

    expect(result).toMatchObject({ stale: false, source: 'cache' })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('serves stale data after a failure within the window', async () => {
    let now = 0
    const cache = build(() => now)
    await cache.getOrLoad('key', async () => 'value')
    now = 5000

    const result = await cache.getOrLoad('key', async () => {
      throw new Error('down')
    })
    expect(result).toMatchObject({ stale: true, source: 'stale-cache', value: 'value' })
  })

  it('does not serve stale data when the cache is empty', async () => {
    const cache = build(() => 0)
    await expect(
      cache.getOrLoad('key', async () => {
        throw new Error('down')
      })
    ).rejects.toThrow('down')
  })

  it('isolates keys by every result-affecting dimension', async () => {
    const cache = build(() => 0)
    const keys = [
      'tmdb:section:movie:popular:en-US:1',
      'tmdb:section:movie:popular:es-ES:1',
      'tmdb:section:movie:popular:en-US:2',
      'tmdb:section:tv:popular:en-US:1',
      'tmdb:item:movie:550:en-US',
    ]
    for (const key of keys) {
      await cache.getOrLoad(key, async () => key)
    }
    expect(cache.size).toBe(keys.length)
  })

  it('shares one in-flight request for identical misses', async () => {
    const cache = build(() => 0)
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

  it('evicts to respect the maximum entry count', async () => {
    const cache = build(() => 0, 2)
    await cache.getOrLoad('a', async () => 1)
    await cache.getOrLoad('b', async () => 2)
    await cache.getOrLoad('c', async () => 3)
    expect(cache.size).toBe(2)
  })
})
