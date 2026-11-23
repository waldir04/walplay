import type {
  AvailabilityData,
  AvailabilityGroup,
  AvailabilityMeta,
} from '../domain/availability.js'
import { AVAILABILITY_DEFAULT_REGION } from '../domain/availability.js'
import type { MediaType } from '../domain/catalog.js'
import {
  CatalogError,
  isCatalogError,
  validationError,
} from '../domain/errors.js'
import type { AvailabilityProvider, ProviderAvailability } from '../providers/availability-provider.js'
import { ProviderHttpError } from '../providers/tmdb/tmdb.errors.js'
import type { CatalogCache, CacheResult } from './catalog-cache.js'
import { mapProviderError } from './catalog.service.js'

export interface AvailabilityServiceDependencies {
  readonly provider: AvailabilityProvider
  readonly cache: CatalogCache
  readonly supportedRegions: readonly string[]
  readonly freshnessWindowMs: number
  readonly retentionMs: number
  readonly now?: () => number
}

export interface AvailabilityRequest {
  readonly mediaType: MediaType
  readonly providerId: number
  readonly region?: string
}

export interface AvailabilityServiceResult {
  readonly data: AvailabilityData
  readonly meta?: AvailabilityMeta
}

const parseTimestamp = (value: string | undefined, now: number): number | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp) || timestamp > now) {
    return undefined
  }
  return timestamp
}

const mapAvailabilityError = (error: unknown): CatalogError => {
  if (isCatalogError(error)) {
    return error
  }
  if (error instanceof ProviderHttpError && error.status === 404) {
    return new CatalogError('CATALOG_NOT_FOUND')
  }
  return mapProviderError(error)
}

export class AvailabilityService {
  private readonly provider: AvailabilityProvider
  private readonly cache: CatalogCache
  private readonly supportedRegions: readonly string[]
  private readonly freshnessWindowMs: number
  private readonly retentionMs: number
  private readonly now: () => number

  public constructor({
    provider,
    cache,
    supportedRegions,
    freshnessWindowMs,
    retentionMs,
    now = Date.now,
  }: AvailabilityServiceDependencies) {
    this.provider = provider
    this.cache = cache
    this.supportedRegions = supportedRegions
    this.freshnessWindowMs = freshnessWindowMs
    this.retentionMs = retentionMs
    this.now = now
  }

  public getRegions(): readonly string[] {
    return [...this.supportedRegions].sort()
  }

  public async getAvailability({
    mediaType,
    providerId,
    region = AVAILABILITY_DEFAULT_REGION,
  }: AvailabilityRequest): Promise<AvailabilityServiceResult> {
    if (!Number.isSafeInteger(providerId) || providerId <= 0) {
      throw validationError(['itemId'])
    }

    const normalizedRegion = region.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(normalizedRegion)) {
      throw validationError(['region'])
    }

    if (!this.supportedRegions.includes(normalizedRegion)) {
      return {
        data: { state: 'unsupported-region', region: normalizedRegion, groups: [] },
      }
    }

    const key = [
      this.provider.id,
      'availability',
      mediaType,
      String(providerId),
      normalizedRegion,
    ].join(':')

    try {
      const cached = await this.cache.getOrLoad<ProviderAvailability | null>(key, () =>
        this.provider.fetchAvailability({ mediaType, providerId, region: normalizedRegion })
      )
      return this.buildResult(normalizedRegion, cached)
    } catch (error) {
      throw mapAvailabilityError(error)
    }
  }

  private buildResult(
    region: string,
    cached: CacheResult<ProviderAvailability | null>
  ): AvailabilityServiceResult {
    const now = this.now()
    const observation = parseTimestamp(cached.lastUpdatedAt, Number.POSITIVE_INFINITY)
    if (observation === undefined) {
      throw new CatalogError('CATALOG_INVALID_RESPONSE')
    }

    const sourceUpdatedAtValue = cached.value?.sourceUpdatedAt
    const sourceUpdatedAt = parseTimestamp(sourceUpdatedAtValue, now)
    const applicableTimestamp =
      sourceUpdatedAt === undefined ? observation : Math.min(observation, sourceUpdatedAt)

    if (now - applicableTimestamp > this.retentionMs) {
      throw new CatalogError('CATALOG_UNAVAILABLE')
    }

    const freshness = now - applicableTimestamp > this.freshnessWindowMs ? 'stale' : 'current'
    const stale = cached.stale || freshness === 'stale'
    const groups: readonly AvailabilityGroup[] = cached.value?.groups ?? []
    const destination = cached.value?.destination
    const state = groups.length > 0 ? 'available' : 'no-information'

    return {
      data: {
        state,
        region,
        groups,
        ...(destination === undefined ? {} : { destination }),
      },
      meta: {
        stale,
        lastUpdatedAt: cached.lastUpdatedAt,
        source: cached.source,
        freshness,
        ...(sourceUpdatedAt === undefined
          ? {}
          : { sourceUpdatedAt: sourceUpdatedAtValue ?? '' }),
      },
    }
  }
}
