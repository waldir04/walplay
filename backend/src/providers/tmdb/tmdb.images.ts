import type { CatalogPoster } from '../../domain/catalog.js'
import type { AvailabilityProviderLogo } from '../../domain/availability.js'
import type { TmdbClient } from './tmdb.client.js'
import { imageConfigurationSchema } from './tmdb.schemas.js'

const GRID_SIZE = 'w342'
const LARGE_SIZE = 'w780'
const BACKDROP_SIZE = 'w780'
const BACKDROP_LARGE_SIZE = 'w1280'
const PROFILE_SIZE = 'w185'
const STILL_SIZE = 'w300'
const PROVIDER_LOGO_SIZE = 'w92'
const PROVIDER_LOGO_LARGE_SIZE = 'w154'

export interface ImageResolver {
  readonly ensureReady: () => Promise<void>
  readonly resolvePoster: (path: string | null | undefined) => CatalogPoster | undefined
  readonly resolveBackdrop: (path: string | null | undefined) => CatalogPoster | undefined
  readonly resolveProfile: (path: string | null | undefined) => CatalogPoster | undefined
  readonly resolveStill: (path: string | null | undefined) => CatalogPoster | undefined
  readonly resolveProviderLogo: (
    path: string | null | undefined
  ) => AvailabilityProviderLogo | undefined
}

export interface ImageResolverOptions {
  readonly ttlMs: number
  readonly now?: () => number
}

interface CachedConfiguration {
  readonly baseUrl: string
  readonly expiresAt: number
}

const normalizePath = (path: string | null | undefined): string | undefined => {
  if (typeof path !== 'string') {
    return undefined
  }
  const trimmed = path.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const buildPoster = (baseUrl: string, normalizedPath: string): CatalogPoster => ({
  url: `${baseUrl}/${GRID_SIZE}${normalizedPath}`,
  urlLarge: `${baseUrl}/${LARGE_SIZE}${normalizedPath}`,
})

export const createImageResolver = (
  client: TmdbClient,
  { ttlMs, now = Date.now }: ImageResolverOptions
): ImageResolver => {
  let configuration: CachedConfiguration | null = null
  let inFlight: Promise<CachedConfiguration | null> | null = null

  const loadConfiguration = async (): Promise<CachedConfiguration | null> => {
    try {
      const response = await client.request('/configuration', {}, imageConfigurationSchema)
      const baseUrl = response.images.secure_base_url.replace(/\/+$/, '')
      return { baseUrl, expiresAt: now() + ttlMs }
    } catch {
      return null
    }
  }

  const getConfiguration = async (): Promise<CachedConfiguration | null> => {
    if (configuration && configuration.expiresAt > now()) {
      return configuration
    }

    if (!inFlight) {
      inFlight = loadConfiguration()
        .then((result) => {
          configuration = result
          return result
        })
        .finally(() => {
          inFlight = null
        })
    }

    return inFlight
  }

  const ensureReady = async (): Promise<void> => {
    await getConfiguration()
  }

  const resolveWith = (
    path: string | null | undefined,
    build: (baseUrl: string, normalizedPath: string) => CatalogPoster
  ): CatalogPoster | undefined => {
    if (configuration === null) {
      return undefined
    }
    const normalizedPath = normalizePath(path)
    if (normalizedPath === undefined) {
      return undefined
    }
    return build(configuration.baseUrl, normalizedPath)
  }

  const resolvePoster = (path: string | null | undefined): CatalogPoster | undefined =>
    resolveWith(path, buildPoster)

  const resolveBackdrop = (path: string | null | undefined): CatalogPoster | undefined =>
    resolveWith(path, (baseUrl, normalizedPath) => ({
      url: `${baseUrl}/${BACKDROP_SIZE}${normalizedPath}`,
      urlLarge: `${baseUrl}/${BACKDROP_LARGE_SIZE}${normalizedPath}`,
    }))

  const resolveProfile = (path: string | null | undefined): CatalogPoster | undefined =>
    resolveWith(path, (baseUrl, normalizedPath) => ({
      url: `${baseUrl}/${PROFILE_SIZE}${normalizedPath}`,
    }))

  const resolveStill = (path: string | null | undefined): CatalogPoster | undefined =>
    resolveWith(path, (baseUrl, normalizedPath) => ({
      url: `${baseUrl}/${STILL_SIZE}${normalizedPath}`,
    }))

  const resolveProviderLogo = (
    path: string | null | undefined
  ): AvailabilityProviderLogo | undefined => {
    if (configuration === null) {
      return undefined
    }
    const normalizedPath = normalizePath(path)
    if (normalizedPath === undefined) {
      return undefined
    }
    return {
      url: `${configuration.baseUrl}/${PROVIDER_LOGO_SIZE}${normalizedPath}`,
      urlLarge: `${configuration.baseUrl}/${PROVIDER_LOGO_LARGE_SIZE}${normalizedPath}`,
    }
  }

  return Object.freeze({
    ensureReady,
    resolvePoster,
    resolveBackdrop,
    resolveProfile,
    resolveStill,
    resolveProviderLogo,
  })
}
