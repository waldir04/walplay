import type { MediaType } from '../domain/catalog.js'
import { CatalogError, isCatalogError, notFoundError, validationError } from '../domain/errors.js'
import type { TrailerInventory, TrailerMeta } from '../domain/trailer.js'
import type { ProviderTrailerInventory, TrailerProvider } from '../providers/trailer-provider.js'
import { ProviderHttpError } from '../providers/tmdb/tmdb.errors.js'
import type { CatalogCache, CacheResult } from './catalog-cache.js'
import { mapProviderError } from './catalog.service.js'

export interface TrailerServiceDependencies {
  readonly provider: TrailerProvider
  readonly cache: CatalogCache
  readonly freshnessWindowMs: number
  readonly retentionMs: number
  readonly now?: () => number
}

export interface TrailerRequest {
  readonly mediaType: MediaType
  readonly providerId: number
}

export interface TrailerServiceResult {
  readonly data: TrailerInventory
  readonly meta: TrailerMeta
}

const mapTrailerError = (error: unknown): CatalogError => {
  if (isCatalogError(error)) {
    return error
  }
  if (error instanceof ProviderHttpError && error.status === 404) {
    return notFoundError()
  }
  return mapProviderError(error)
}

export class TrailerService {
  private readonly provider: TrailerProvider
  private readonly cache: CatalogCache
  private readonly freshnessWindowMs: number
  private readonly retentionMs: number
  private readonly now: () => number

  public constructor({
    provider,
    cache,
    freshnessWindowMs,
    retentionMs,
    now = Date.now,
  }: TrailerServiceDependencies) {
    this.provider = provider
    this.cache = cache
    this.freshnessWindowMs = freshnessWindowMs
    this.retentionMs = retentionMs
    this.now = now
  }

  public async getTrailers({ mediaType, providerId }: TrailerRequest): Promise<TrailerServiceResult> {
    if (!Number.isSafeInteger(providerId) || providerId <= 0) {
      throw validationError(['itemId'])
    }

    const key = [this.provider.id, 'trailers', mediaType, String(providerId)].join(':')

    try {
      const cached = await this.cache.getOrLoad<ProviderTrailerInventory | null>(key, () =>
        this.provider.fetchTrailers({ mediaType, providerId })
      )
      const inventory = cached.value
      if (inventory === null) {
        throw notFoundError()
      }
      return this.buildResult(inventory, cached)
    } catch (error) {
      throw mapTrailerError(error)
    }
  }

  private buildResult(
    inventory: ProviderTrailerInventory,
    cached: CacheResult<unknown>
  ): TrailerServiceResult {
    const now = this.now()
    const observation = Date.parse(cached.lastUpdatedAt)
    if (Number.isNaN(observation)) {
      throw new CatalogError('CATALOG_INVALID_RESPONSE')
    }
    if (now - observation > this.retentionMs) {
      throw new CatalogError('CATALOG_UNAVAILABLE')
    }

    const freshness = now - observation > this.freshnessWindowMs ? 'stale' : 'current'
    const stale = cached.stale || freshness === 'stale'
    const videos = inventory.videos

    return {
      data: {
        state: videos.length > 0 ? 'available' : 'no-videos',
        videos,
      },
      meta: {
        stale,
        lastUpdatedAt: cached.lastUpdatedAt,
        source: cached.source,
        freshness,
      },
    }
  }
}
