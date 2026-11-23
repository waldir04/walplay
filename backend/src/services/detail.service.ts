import type {
  CatalogItem,
  MediaType,
  ProviderLanguage,
} from '../domain/catalog.js'
import { MAX_SEASON_NUMBER } from '../domain/detail.js'
import type {
  Credits,
  DetailResponseMeta,
  RelatedCollection,
  SeasonEpisodes,
  TitleDetail,
} from '../domain/detail.js'
import {
  detailSeasonNotFoundError,
  notFoundError,
  validationError,
} from '../domain/errors.js'
import { decodeItemId } from '../lib/itemId.js'
import type { DetailProvider, ProviderTitleDetail } from '../providers/detail-provider.js'
import type { CatalogCache, CacheResult } from './catalog-cache.js'
import { mapProviderError } from './catalog.service.js'

export interface DetailServiceDependencies {
  readonly provider: DetailProvider
  readonly cache: CatalogCache
}

export interface DetailRequest {
  readonly mediaType: MediaType
  readonly itemId: string
  readonly language: ProviderLanguage
}

export interface SeasonRequest extends DetailRequest {
  readonly seasonNumber: number
}

export interface RelatedItemsData {
  readonly items: readonly CatalogItem[]
}

export interface CollectionData {
  readonly name?: string
  readonly items: readonly CatalogItem[]
}

export interface DetailServiceResult<T> {
  readonly data: T
  readonly meta: DetailResponseMeta
}

interface DetailIdentity {
  readonly mediaType: MediaType
  readonly providerId: number
}

const toMeta = (
  language: ProviderLanguage,
  result: CacheResult<unknown>
): DetailResponseMeta => ({
  language,
  stale: result.stale,
  lastUpdatedAt: result.lastUpdatedAt,
  source: result.source,
})

export class DetailService {
  private readonly provider: DetailProvider
  private readonly cache: CatalogCache

  public constructor({ provider, cache }: DetailServiceDependencies) {
    this.provider = provider
    this.cache = cache
  }

  public async getDetail(request: DetailRequest): Promise<DetailServiceResult<TitleDetail>> {
    const identity = this.resolveIdentity(request)
    try {
      const cached = await this.loadTitleDetail(identity, request.language)
      return { data: cached.value.detail, meta: toMeta(request.language, cached) }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getCredits(request: DetailRequest): Promise<DetailServiceResult<Credits>> {
    const identity = this.resolveIdentity(request)
    const key = [
      this.provider.id,
      'credits',
      identity.mediaType,
      String(identity.providerId),
      request.language,
    ].join(':')

    try {
      const cached = await this.cache.getOrLoad(key, () =>
        this.provider.fetchCredits({
          mediaType: identity.mediaType,
          providerId: identity.providerId,
          language: request.language,
        })
      )
      return { data: cached.value, meta: toMeta(request.language, cached) }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getSimilar(
    request: DetailRequest
  ): Promise<DetailServiceResult<RelatedItemsData>> {
    const identity = this.resolveIdentity(request)
    const key = [
      this.provider.id,
      'similar',
      identity.mediaType,
      String(identity.providerId),
      request.language,
    ].join(':')

    try {
      const cached = await this.cache.getOrLoad(key, () =>
        this.provider.fetchSimilar({
          mediaType: identity.mediaType,
          providerId: identity.providerId,
          language: request.language,
        })
      )
      return {
        data: { items: cached.value.map((related) => related.item) },
        meta: toMeta(request.language, cached),
      }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getCollection(
    request: DetailRequest
  ): Promise<DetailServiceResult<CollectionData>> {
    const identity = this.resolveIdentity(request)
    if (identity.mediaType !== 'movie') {
      throw notFoundError()
    }

    try {
      const core = await this.loadTitleDetail(identity, request.language)
      const collectionProviderId = core.value.collectionProviderId
      if (collectionProviderId === undefined) {
        return { data: { items: [] }, meta: toMeta(request.language, core) }
      }

      const key = [
        this.provider.id,
        'collection',
        identity.mediaType,
        String(identity.providerId),
        request.language,
      ].join(':')

      const cached = await this.cache.getOrLoad(key, () =>
        this.provider.fetchCollection({
          providerId: identity.providerId,
          language: request.language,
          collectionProviderId,
        })
      )

      const collection: RelatedCollection = cached.value
      return {
        data: {
          ...(collection.name === undefined ? {} : { name: collection.name }),
          items: collection.items.map((related) => related.item),
        },
        meta: toMeta(request.language, cached),
      }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getSeason(request: SeasonRequest): Promise<DetailServiceResult<SeasonEpisodes>> {
    const identity = this.resolveIdentity(request)
    if (identity.mediaType !== 'tv') {
      throw notFoundError()
    }
    if (
      !Number.isInteger(request.seasonNumber) ||
      request.seasonNumber < 0 ||
      request.seasonNumber > MAX_SEASON_NUMBER
    ) {
      throw validationError(['seasonNumber'])
    }

    const key = [
      this.provider.id,
      'season',
      String(identity.providerId),
      String(request.seasonNumber),
      request.language,
    ].join(':')

    try {
      const cached = await this.cache.getOrLoad(key, async () => {
        const season = await this.provider.fetchSeason({
          providerId: identity.providerId,
          seasonNumber: request.seasonNumber,
          language: request.language,
        })
        if (season === null) {
          throw detailSeasonNotFoundError()
        }
        return season
      })
      return { data: cached.value, meta: toMeta(request.language, cached) }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  private resolveIdentity(request: DetailRequest): DetailIdentity {
    let reference: ReturnType<typeof decodeItemId>
    try {
      reference = decodeItemId(request.itemId)
    } catch {
      throw validationError(['itemId'])
    }
    if (reference.mediaType !== request.mediaType) {
      throw notFoundError()
    }
    return { mediaType: request.mediaType, providerId: reference.providerId }
  }

  private loadTitleDetail(
    identity: DetailIdentity,
    language: ProviderLanguage
  ): Promise<CacheResult<ProviderTitleDetail>> {
    const key = [
      this.provider.id,
      'detail',
      identity.mediaType,
      String(identity.providerId),
      language,
    ].join(':')

    return this.cache.getOrLoad(key, async () => {
      const result = await this.provider.fetchDetail({
        mediaType: identity.mediaType,
        providerId: identity.providerId,
        language,
      })
      if (result === null) {
        throw notFoundError()
      }
      return result
    })
  }
}
