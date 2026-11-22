import { vi } from 'vitest'

import type { BackendConfig } from '../../config/env.js'
import type {
  CatalogItem,
  CatalogSectionCapability,
  MediaType,
  ProviderLanguage,
  ProviderSectionPage,
  SectionId,
} from '../../domain/catalog.js'
import type { CatalogProvider } from '../../providers/catalog-provider.js'
import { TMDB_CAPABILITIES } from '../../providers/tmdb/tmdb.capabilities.js'
import { encodeItemId } from '../../lib/itemId.js'

export const TEST_CONFIG: BackendConfig = Object.freeze({
  nodeEnv: 'test',
  port: 0,
  corsAllowedOrigins: Object.freeze(['http://localhost:5173']),
  tmdbAccessToken: 'test-token',
  tmdbBaseUrl: 'https://api.example.test/3',
  tmdbTimeoutMs: 1000,
  tmdbMaxRetries: 2,
  tmdbCacheTtlMs: 300_000,
  tmdbCacheStaleMs: 86_400_000,
  tmdbCacheMaxEntries: 100,
  tmdbImageConfigTtlMs: 86_400_000,
  logLevel: 'error',
})

export const sampleItem = (mediaType: MediaType = 'movie', providerId = 550): CatalogItem => ({
  id: encodeItemId(mediaType, providerId),
  mediaType,
  title: mediaType === 'movie' ? 'Fight Club' : 'Example Show',
  releaseYear: 1999,
  rating: { value: 8.4, voteCount: 30_123, scale: 10 },
  genres: [{ id: '18', name: 'Drama' }],
  poster: {
    url: 'https://image.example.test/w342/example.jpg',
    urlLarge: 'https://image.example.test/w780/example.jpg',
  },
})

export const samplePage = (input: {
  mediaType: MediaType
  section: SectionId
  page: number
  totalPages?: number
  items?: readonly CatalogItem[]
}): ProviderSectionPage => ({
  page: input.page,
  items: input.items ?? [sampleItem(input.mediaType)],
  ...(input.totalPages === undefined ? {} : { totalPages: input.totalPages }),
  ...(input.totalPages === undefined ? {} : { totalResults: input.totalPages * 20 }),
})

export interface FakeProvider extends CatalogProvider {
  readonly capabilities: ReturnType<
    typeof vi.fn<() => Promise<readonly CatalogSectionCapability[]>>
  >
  readonly fetchSectionPage: ReturnType<typeof vi.fn<CatalogProvider['fetchSectionPage']>>
  readonly fetchItem: ReturnType<typeof vi.fn<CatalogProvider['fetchItem']>>
}

export const createFakeProvider = (): FakeProvider => ({
  id: 'tmdb',
  capabilities: vi.fn(async () => TMDB_CAPABILITIES),
  fetchSectionPage: vi.fn(
    async (input: {
      mediaType: MediaType
      section: SectionId
      language: ProviderLanguage
      page: number
    }) =>
      samplePage({
        mediaType: input.mediaType,
        section: input.section,
        page: input.page,
        totalPages: input.section === 'trending' ? undefined : 10,
      })
  ),
  fetchItem: vi.fn(
    async (input: { mediaType: MediaType; providerId: number; language: ProviderLanguage }) =>
      sampleItem(input.mediaType, input.providerId)
  ),
})
