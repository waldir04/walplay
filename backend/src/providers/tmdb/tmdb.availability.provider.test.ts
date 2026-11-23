import { describe, expect, it, vi } from 'vitest'

import type { TmdbClient } from './tmdb.client.js'
import { ProviderHttpError, ProviderTimeoutError } from './tmdb.errors.js'
import type { ImageResolver } from './tmdb.images.js'
import { createTmdbAvailabilityProvider } from './tmdb.availability.provider.js'

const payload = {
  id: 550,
  results: {
    CO: {
      link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=CO',
      flatrate: [
        {
          provider_id: 1899,
          provider_name: 'HBO Max',
          display_priority: 1,
          logo_path: '/hbo.png',
        },
      ],
    },
  },
}

const createImages = (): ImageResolver => ({
  ensureReady: vi.fn(async () => undefined),
  resolvePoster: vi.fn(() => undefined),
  resolveBackdrop: vi.fn(() => undefined),
  resolveProfile: vi.fn(() => undefined),
  resolveStill: vi.fn(() => undefined),
  resolveProviderLogo: vi.fn((path: string | null | undefined) =>
    path ? { url: `https://image.example.test/w92${path}` } : undefined
  ),
})

const createProvider = (input: {
  readonly request?: TmdbClient['request']
  readonly logosEnabled?: boolean
  readonly images?: ImageResolver
}) => {
  const request = input.request ?? vi.fn(async () => payload)
  const images = input.images ?? createImages()
  return {
    provider: createTmdbAvailabilityProvider({
      client: { request } as unknown as TmdbClient,
      images,
      logosEnabled: input.logosEnabled ?? false,
      destinationHosts: ['www.themoviedb.org', 'themoviedb.org'],
    }),
    request,
    images,
  }
}

describe('tmdb availability provider', () => {
  it('requests the documented movie watch-provider path without a language', async () => {
    const { provider, request } = createProvider({})

    const result = await provider.fetchAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('/movie/550/watch/providers', {}, expect.anything())
    expect(result?.groups[0]?.category).toBe('subscription')
    expect(result?.groups[0]?.providers[0]?.name).toBe('HBO Max')
  })

  it('uses the tv watch-provider path', async () => {
    const { provider, request } = createProvider({})

    await provider.fetchAvailability({ mediaType: 'tv', providerId: 1399, region: 'CO' })

    expect(request).toHaveBeenCalledWith('/tv/1399/watch/providers', {}, expect.anything())
  })

  it('returns null when the requested region has no entry', async () => {
    const { provider } = createProvider({})

    await expect(
      provider.fetchAvailability({ mediaType: 'movie', providerId: 550, region: 'FR' })
    ).resolves.toBeNull()
  })

  it('maps only the requested region', async () => {
    const request = vi.fn(async () => ({
      id: 550,
      results: {
        CO: { flatrate: [{ provider_id: 1, provider_name: 'Colombia service' }] },
        US: { flatrate: [{ provider_id: 2, provider_name: 'US service' }] },
      },
    })) as unknown as TmdbClient['request']
    const { provider } = createProvider({ request })

    const result = await provider.fetchAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(JSON.stringify(result)).toContain('Colombia service')
    expect(JSON.stringify(result)).not.toContain('US service')
  })

  it('propagates a 404 so the service maps it to CATALOG_NOT_FOUND', async () => {
    const request = vi.fn(async () => {
      throw new ProviderHttpError(404)
    })
    const { provider } = createProvider({ request })

    await expect(
      provider.fetchAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toBeInstanceOf(ProviderHttpError)
  })

  it('propagates provider failures', async () => {
    const request = vi.fn(async () => {
      throw new ProviderTimeoutError()
    })
    const { provider } = createProvider({ request })

    await expect(
      provider.fetchAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })
    ).rejects.toBeInstanceOf(ProviderTimeoutError)
  })

  it('rejects a destination whose host is not allowlisted', async () => {
    const request = vi.fn(async () => ({
      id: 550,
      results: {
        CO: {
          link: 'https://evil.example.test/movie/550/watch?locale=CO',
          flatrate: [{ provider_id: 1, provider_name: 'HBO Max' }],
        },
      },
    })) as unknown as TmdbClient['request']
    const { provider } = createProvider({ request })

    const result = await provider.fetchAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(result?.destination).toBeUndefined()
  })

  it('does not prepare the image resolver when logos are disabled', async () => {
    const { provider, images } = createProvider({ logosEnabled: false })

    await provider.fetchAvailability({ mediaType: 'movie', providerId: 550, region: 'CO' })

    expect(images.ensureReady).not.toHaveBeenCalled()
    expect(images.resolveProviderLogo).not.toHaveBeenCalled()
  })

  it('prepares images and resolves provider logos when logos are enabled', async () => {
    const { provider, images } = createProvider({ logosEnabled: true })

    const result = await provider.fetchAvailability({
      mediaType: 'movie',
      providerId: 550,
      region: 'CO',
    })

    expect(images.ensureReady).toHaveBeenCalledTimes(1)
    expect(images.resolveProviderLogo).toHaveBeenCalledWith('/hbo.png')
    expect(result?.groups[0]?.providers[0]?.logo).toEqual({
      url: 'https://image.example.test/w92/hbo.png',
    })
  })
})
