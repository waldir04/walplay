import type { CatalogItem, CatalogPoster, MediaType, CatalogResponseMeta } from './catalog.js'

export const CAST_PREVIEW_LIMIT = 10
export const CREW_PREVIEW_LIMIT = 6
export const SIMILAR_PREVIEW_LIMIT = 12
export const COLLECTION_PREVIEW_LIMIT = 12
export const MIN_PLAUSIBLE_YEAR = 1888
export const MAX_PLAUSIBLE_YEAR = 2100
export const MAX_PLAUSIBLE_MOVIE_RUNTIME_MINUTES = 900
export const MAX_PLAUSIBLE_EPISODE_RUNTIME_MINUTES = 600
export const MIN_SEASON_NUMBER = 0
export const MAX_SEASON_NUMBER = 999
export const MAX_EPISODE_NUMBER = 9999
export const MAX_TV_NETWORKS = 5

export type TitleStatus =
  | 'released'
  | 'in-production'
  | 'post-production'
  | 'planned'
  | 'rumored'
  | 'returning'
  | 'ended'
  | 'canceled'
  | 'pilot'

export type CrewRole = 'director' | 'creator' | 'writer'

export interface TitleRating {
  readonly value: number
  readonly voteCount: number
  readonly scale: 10
  readonly source: 'tmdb'
}

export type Genre = {
  readonly id: string
  readonly name: string
}

export interface Duration {
  readonly minutes: number
  readonly kind: 'movie'
}

export interface EpisodeDuration {
  readonly minMinutes: number
  readonly maxMinutes?: number
}

export interface Person {
  readonly name: string
  readonly profile?: CatalogPoster
}

export interface CastCredit extends Person {
  readonly character?: string
}

export interface CrewCredit extends Person {
  readonly role: CrewRole
}

export interface Credits {
  readonly cast: readonly CastCredit[]
  readonly crew: readonly CrewCredit[]
}

export interface TvSummary {
  readonly seasonsCount?: number
  readonly episodesCount?: number
  readonly firstAirDate?: string
  readonly latestAirDate?: string
  readonly networks?: readonly string[]
}

export interface Season {
  readonly number: number
  readonly name?: string
  readonly airYear?: number
  readonly episodeCount?: number
}

export interface Episode {
  readonly number?: number
  readonly name?: string
  readonly airDate?: string
  readonly runtimeMinutes?: number
  readonly overview?: string
  readonly still?: CatalogPoster
  readonly rating?: TitleRating
}

export interface SeasonEpisodes {
  readonly season: Season
  readonly episodes: readonly Episode[]
}

export interface RelatedTitle {
  readonly item: CatalogItem
}

export interface RelatedCollection {
  readonly name?: string
  readonly items: readonly RelatedTitle[]
}

export interface TitleDetail {
  readonly id: string
  readonly mediaType: MediaType
  readonly title: string
  readonly originalTitle?: string
  readonly overview?: string
  readonly tagline?: string
  readonly releaseDate?: string
  readonly releaseYear?: number
  readonly status?: TitleStatus
  readonly genres: readonly Genre[]
  readonly runtime?: Duration
  readonly episodeRuntime?: EpisodeDuration
  readonly rating?: TitleRating
  readonly popularity?: number
  readonly poster?: CatalogPoster
  readonly backdrop?: CatalogPoster
  readonly tvSummary?: TvSummary
  readonly seasons?: readonly Season[]
  readonly collection?: { readonly name: string }
  readonly trailer?: { readonly url: string; readonly site: 'youtube' }
}

export type DetailResponseMeta = CatalogResponseMeta
