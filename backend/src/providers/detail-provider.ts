import type { MediaType, ProviderLanguage } from '../domain/catalog.js'
import type {
  Credits,
  RelatedCollection,
  RelatedTitle,
  SeasonEpisodes,
  TitleDetail,
} from '../domain/detail.js'

export interface ProviderTitleDetail {
  readonly detail: TitleDetail
  readonly collectionProviderId?: number
}

export interface DetailIdentityInput {
  readonly mediaType: MediaType
  readonly providerId: number
  readonly language: ProviderLanguage
}

export interface DetailProvider {
  readonly id: 'tmdb'
  readonly fetchDetail: (input: DetailIdentityInput) => Promise<ProviderTitleDetail | null>
  readonly fetchCredits: (input: DetailIdentityInput) => Promise<Credits>
  readonly fetchSimilar: (input: DetailIdentityInput) => Promise<readonly RelatedTitle[]>
  readonly fetchCollection: (input: {
    readonly providerId: number
    readonly language: ProviderLanguage
    readonly collectionProviderId: number
  }) => Promise<RelatedCollection>
  readonly fetchSeason: (input: {
    readonly providerId: number
    readonly seasonNumber: number
    readonly language: ProviderLanguage
  }) => Promise<SeasonEpisodes | null>
}
