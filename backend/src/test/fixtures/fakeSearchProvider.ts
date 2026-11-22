import type {
  CatalogItem,
  MediaType,
  ProviderLanguage,
} from '../../domain/catalog.js'
import type { ProviderSearchPage } from '../../domain/search.js'
import type { SearchProvider } from '../../providers/search-provider.js'
import { CatalogCache } from '../../services/catalog-cache.js'
import { SearchService } from '../../services/search.service.js'

export interface FakeSearchProviderOptions {
  readonly pages?: Readonly<Record<number, ProviderSearchPage>>
  readonly delayMs?: number
  readonly error?: Error
}

export interface FakeSearchProvider extends SearchProvider {
  readonly calls: readonly {
    readonly query: string
    readonly language: ProviderLanguage
    readonly page: number
  }[]
}

export const createFakeSearchProvider = (
  options: FakeSearchProviderOptions = {}
): FakeSearchProvider => {
  const calls: { query: string; language: ProviderLanguage; page: number }[] = []

  const defaultPage = (page: number): ProviderSearchPage => ({
    page,
    items: [],
    totalPages: 1,
  })

  const fetchSearchPage: SearchProvider['fetchSearchPage'] = async ({
    query,
    language,
    page,
  }) => {
    calls.push({ query, language, page })
    if (options.delayMs !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    }
    if (options.error !== undefined) {
      throw options.error
    }
    return options.pages?.[page] ?? defaultPage(page)
  }

  return Object.freeze({
    id: 'tmdb' as const,
    fetchSearchPage,
    calls,
  })
}

export const createTestSearchService = (
  provider: SearchProvider = createFakeSearchProvider()
): SearchService =>
  new SearchService({
    provider,
    cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 }),
  })

export const searchItem = (
  mediaType: MediaType = 'movie',
  providerId = 550
): CatalogItem => ({
  id: Buffer.from(`wl1:${mediaType}:${providerId}`, 'utf8').toString('base64url'),
  mediaType,
  title: mediaType === 'movie' ? 'Fight Club' : 'Example Show',
  releaseYear: 1999,
  rating: { value: 8.4, voteCount: 30_123, scale: 10 },
  genres: [{ id: '18', name: 'Drama' }],
})
