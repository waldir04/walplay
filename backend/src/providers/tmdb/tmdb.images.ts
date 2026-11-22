import type { CatalogPoster } from '../../domain/catalog.js'
import type { TmdbClient } from './tmdb.client.js'
import { imageConfigurationSchema } from './tmdb.schemas.js'

const GRID_SIZE = 'w342'
const LARGE_SIZE = 'w780'

export interface ImageResolver {
  readonly ensureReady: () => Promise<void>
  readonly resolvePoster: (path: string | null | undefined) => CatalogPoster | undefined
}

export interface ImageResolverOptions {
  readonly ttlMs: number
  readonly now?: () => number
}

interface CachedConfiguration {
  readonly baseUrl: string
  readonly expiresAt: number
}

const buildPoster = (baseUrl: string, path: string): CatalogPoster => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return {
    url: `${baseUrl}/${GRID_SIZE}${normalizedPath}`,
    urlLarge: `${baseUrl}/${LARGE_SIZE}${normalizedPath}`,
  }
}

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

  const resolvePoster = (path: string | null | undefined): CatalogPoster | undefined => {
    if (configuration === null || typeof path !== 'string' || path.trim().length === 0) {
      return undefined
    }
    return buildPoster(configuration.baseUrl, path)
  }

  return Object.freeze({ ensureReady, resolvePoster })
}
