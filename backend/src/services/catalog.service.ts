import type {
  CatalogItem,
  CatalogPage,
  CatalogResponseMeta,
  CatalogSectionCapability,
  MediaType,
  ProviderLanguage,
  SectionId,
} from '../domain/catalog.js'
import { CatalogError, notFoundError, validationError } from '../domain/errors.js'
import { decodeItemId } from '../lib/itemId.js'
import type { CatalogProvider } from '../providers/catalog-provider.js'
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderValidationError,
} from '../providers/tmdb/tmdb.errors.js'
import type { CatalogCache } from './catalog-cache.js'

export interface CatalogServiceDependencies {
  readonly provider: CatalogProvider
  readonly cache: CatalogCache
}

export interface SectionPageRequest {
  readonly mediaType: MediaType
  readonly section: SectionId
  readonly language: ProviderLanguage
  readonly page: number
}

export interface ItemRequest {
  readonly mediaType: MediaType
  readonly itemId: string
  readonly language: ProviderLanguage
}

export interface CatalogServiceResult<T> {
  readonly data: T
  readonly meta: CatalogResponseMeta
}

export interface CapabilitiesData {
  readonly sections: readonly CatalogSectionCapability[]
}

export const mapProviderError = (error: unknown): CatalogError => {
  if (error instanceof CatalogError) {
    return error
  }
  if (error instanceof ProviderRateLimitError) {
    return new CatalogError('CATALOG_RATE_LIMITED')
  }
  if (error instanceof ProviderTimeoutError) {
    return new CatalogError('CATALOG_TIMEOUT')
  }
  if (error instanceof ProviderValidationError) {
    return new CatalogError('CATALOG_INVALID_RESPONSE')
  }
  if (error instanceof ProviderHttpError || error instanceof ProviderNetworkError) {
    return new CatalogError('CATALOG_UNAVAILABLE')
  }
  return new CatalogError('INTERNAL_ERROR')
}

export class CatalogService {
  private readonly provider: CatalogProvider
  private readonly cache: CatalogCache

  public constructor({ provider, cache }: CatalogServiceDependencies) {
    this.provider = provider
    this.cache = cache
  }

  public async getCapabilities(): Promise<CapabilitiesData> {
    try {
      const sections = await this.provider.capabilities()
      return { sections: [...sections].sort((left, right) => left.order - right.order) }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getSectionPage(
    request: SectionPageRequest
  ): Promise<CatalogServiceResult<CatalogPage>> {
    if (!Number.isInteger(request.page) || request.page < 1) {
      throw validationError(['page'])
    }

    const capabilities = await this.getCapabilities()
    const capability = capabilities.sections.find((section) => section.id === request.section)

    if (!capability || !capability.mediaTypes.includes(request.mediaType)) {
      throw validationError(['section'])
    }

    if (request.section === 'trending' && request.page !== 1) {
      throw validationError(['page'])
    }

    const key = [
      this.provider.id,
      'section',
      request.mediaType,
      request.section,
      request.language,
      String(request.page),
    ].join(':')

    try {
      const result = await this.cache.getOrLoad(key, () =>
        this.provider.fetchSectionPage({
          mediaType: request.mediaType,
          section: request.section,
          language: request.language,
          page: request.page,
        })
      )

      const totalPages = result.value.totalPages
      const hasMore =
        capability.paginated &&
        result.value.items.length > 0 &&
        totalPages !== undefined &&
        Number.isInteger(totalPages) &&
        totalPages > request.page

      const data: CatalogPage = {
        mediaType: request.mediaType,
        section: request.section,
        page: request.page,
        items: result.value.items,
        ...(totalPages === undefined ? {} : { totalPages }),
        ...(result.value.totalResults === undefined
          ? {}
          : { totalResults: result.value.totalResults }),
        hasMore,
      }

      return {
        data,
        meta: {
          language: request.language,
          stale: result.stale,
          lastUpdatedAt: result.lastUpdatedAt,
          source: result.source,
        },
      }
    } catch (error) {
      throw mapProviderError(error)
    }
  }

  public async getItem(request: ItemRequest): Promise<CatalogServiceResult<CatalogItem>> {
    let reference: ReturnType<typeof decodeItemId>
    try {
      reference = decodeItemId(request.itemId)
    } catch {
      throw notFoundError()
    }

    if (reference.mediaType !== request.mediaType) {
      throw notFoundError()
    }

    const key = [
      this.provider.id,
      'item',
      request.mediaType,
      String(reference.providerId),
      request.language,
    ].join(':')

    try {
      const result = await this.cache.getOrLoad(key, async () => {
        const item = await this.provider.fetchItem({
          mediaType: request.mediaType,
          providerId: reference.providerId,
          language: request.language,
        })
        if (item === null) {
          throw notFoundError()
        }
        return item
      })

      return {
        data: result.value,
        meta: {
          language: request.language,
          stale: result.stale,
          lastUpdatedAt: result.lastUpdatedAt,
          source: result.source,
        },
      }
    } catch (error) {
      throw mapProviderError(error)
    }
  }
}
