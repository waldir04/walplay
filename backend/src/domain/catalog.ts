export type MediaType = 'movie' | 'tv'

export type SectionId = 'trending' | 'popular' | 'top-rated'

export type ProviderLanguage = 'en-US' | 'es-ES'

export interface CatalogRating {
  readonly value: number
  readonly voteCount: number
  readonly scale: 10
}

export interface CatalogGenre {
  readonly id: string
  readonly name: string
}

export interface CatalogPoster {
  readonly url: string
  readonly urlLarge?: string
}

export interface CatalogSectionCapability {
  readonly id: SectionId
  readonly order: number
  readonly mediaTypes: readonly MediaType[]
  readonly paginated: boolean
}

export interface CatalogResponseMeta {
  readonly language: ProviderLanguage
  readonly stale: boolean
  readonly lastUpdatedAt: string
  readonly source: 'provider' | 'cache' | 'stale-cache'
}

export interface CatalogItem {
  readonly id: string
  readonly mediaType: MediaType
  readonly title: string
  readonly originalTitle?: string
  readonly releaseYear?: number
  readonly rating?: CatalogRating
  readonly genres: readonly CatalogGenre[]
  readonly poster?: CatalogPoster
}

export interface CatalogPage {
  readonly mediaType: MediaType
  readonly section: SectionId
  readonly page: number
  readonly items: readonly CatalogItem[]
  readonly totalPages?: number
  readonly totalResults?: number
  readonly hasMore: boolean
}

export interface ProviderSectionPage {
  readonly page: number
  readonly items: readonly CatalogItem[]
  readonly totalPages?: number
  readonly totalResults?: number
}

export type ProviderItem = CatalogItem

export interface ProviderReference {
  readonly provider: 'tmdb'
  readonly providerId: number
  readonly mediaType: MediaType
}

export const MEDIA_TYPES: readonly MediaType[] = ['movie', 'tv']

export const SECTION_IDS: readonly SectionId[] = ['trending', 'popular', 'top-rated']

export const isMediaType = (value: unknown): value is MediaType =>
  value === 'movie' || value === 'tv'

export const isSectionId = (value: unknown): value is SectionId =>
  value === 'trending' || value === 'popular' || value === 'top-rated'
