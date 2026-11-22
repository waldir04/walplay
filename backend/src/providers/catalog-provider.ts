import type {
  CatalogItem,
  CatalogPoster,
  CatalogSectionCapability,
  MediaType,
  ProviderLanguage,
  ProviderSectionPage,
  SectionId,
} from '../domain/catalog.js'

export interface CatalogProvider {
  readonly id: 'tmdb'
  readonly capabilities: () => Promise<readonly CatalogSectionCapability[]>
  readonly fetchSectionPage: (input: {
    readonly mediaType: MediaType
    readonly section: SectionId
    readonly language: ProviderLanguage
    readonly page: number
  }) => Promise<ProviderSectionPage>
  readonly fetchItem: (input: {
    readonly mediaType: MediaType
    readonly providerId: number
    readonly language: ProviderLanguage
  }) => Promise<CatalogItem | null>
}

export type PosterResolver = (path: string | null | undefined) => CatalogPoster | undefined
