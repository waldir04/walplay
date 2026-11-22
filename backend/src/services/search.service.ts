import type { CatalogResponseMeta, ProviderLanguage } from '../domain/catalog.js'
import {
  SEARCH_MAX_REQUEST_PAGE,
  buildSearchCacheKey,
  buildSearchQuery,
  isValidSearchQuery,
} from '../domain/search.js'
import type { CatalogItem } from '../domain/catalog.js'
import { validationError } from '../domain/errors.js'
import type { CatalogError } from '../domain/errors.js'
import type { SearchProvider } from '../providers/search-provider.js'
import { ProviderHttpError } from '../providers/tmdb/tmdb.errors.js'
import type { CatalogCache } from './catalog-cache.js'
import { mapProviderError } from './catalog.service.js'

export interface SearchServiceDependencies {
  readonly provider: SearchProvider
  readonly cache: CatalogCache
}

export interface SearchPageRequest {
  readonly query: string
  readonly language: ProviderLanguage
  readonly page: number
}

export interface SearchPageData {
  readonly page: number
  readonly items: readonly CatalogItem[]
  readonly totalPages?: number
  readonly hasMore: boolean
}

export interface SearchServiceResult {
  readonly data: SearchPageData
  readonly meta: CatalogResponseMeta
}

export const mapSearchProviderError = (error: unknown): CatalogError => {
  if (error instanceof ProviderHttpError && (error.status === 400 || error.status === 422)) {
    return validationError()
  }
  return mapProviderError(error)
}

export class SearchService {
  private readonly provider: SearchProvider
  private readonly cache: CatalogCache

  public constructor({ provider, cache }: SearchServiceDependencies) {
    this.provider = provider
    this.cache = cache
  }

  public async getSearchPage(request: SearchPageRequest): Promise<SearchServiceResult> {
    const query = buildSearchQuery(request.query)
    if (
      !isValidSearchQuery(query) ||
      !Number.isInteger(request.page) ||
      request.page < 1 ||
      request.page > SEARCH_MAX_REQUEST_PAGE
    ) {
      throw validationError()
    }

    const key = buildSearchCacheKey({
      provider: this.provider.id,
      identity: query.identity,
      language: request.language,
      page: request.page,
    })

    try {
      const result = await this.cache.getOrLoad(key, () =>
        this.provider.fetchSearchPage({
          query: query.trimmed,
          language: request.language,
          page: request.page,
        })
      )

      const totalPages = result.value.totalPages
      const hasMore = totalPages !== undefined && totalPages > request.page

      return {
        data: {
          page: request.page,
          items: result.value.items,
          ...(totalPages === undefined ? {} : { totalPages }),
          hasMore,
        },
        meta: {
          language: request.language,
          stale: result.stale,
          lastUpdatedAt: result.lastUpdatedAt,
          source: result.source,
        },
      }
    } catch (error) {
      throw mapSearchProviderError(error)
    }
  }
}
