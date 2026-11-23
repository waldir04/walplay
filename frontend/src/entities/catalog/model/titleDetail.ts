import { z } from 'zod'

import {
  MAX_PLAUSIBLE_YEAR,
  MIN_PLAUSIBLE_YEAR,
  MAX_SEASON_NUMBER,
  MIN_SEASON_NUMBER,
} from '@/shared/config/constants'

import { catalogItemSchema, catalogPosterSchema } from './catalogItem'
import type { CatalogItem, CatalogPoster } from './catalogItem'
import { catalogResponseMetaSchema } from './catalogSection'
import type { CatalogResponseMeta } from './catalogSection'

export const titleRatingSchema = z.object({
  value: z.number().finite().gt(0).lte(10),
  voteCount: z.number().int().positive(),
  scale: z.literal(10),
  source: z.literal('tmdb'),
})
export type TitleRating = z.infer<typeof titleRatingSchema>

export const genreSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
})
export type Genre = z.infer<typeof genreSchema>

export const titleStatusSchema = z.enum([
  'released',
  'in-production',
  'post-production',
  'planned',
  'rumored',
  'returning',
  'ended',
  'canceled',
  'pilot',
])
export type TitleStatus = z.infer<typeof titleStatusSchema>

export const crewRoleSchema = z.enum(['director', 'creator', 'writer'])
export type CrewRole = z.infer<typeof crewRoleSchema>

export const durationSchema = z.object({
  minutes: z.number().int().positive(),
  kind: z.literal('movie'),
})
export type Duration = z.infer<typeof durationSchema>

export const episodeDurationSchema = z
  .object({
    minMinutes: z.number().int().positive(),
    maxMinutes: z.number().int().positive().optional(),
  })
  .refine(
    (value) => value.maxMinutes === undefined || value.maxMinutes >= value.minMinutes,
    'maxMinutes must not be below minMinutes'
  )
export type EpisodeDuration = z.infer<typeof episodeDurationSchema>

export const tvSummarySchema = z.object({
  seasonsCount: z.number().int().nonnegative().optional(),
  episodesCount: z.number().int().nonnegative().optional(),
  firstAirDate: z.string().min(1).optional(),
  latestAirDate: z.string().min(1).optional(),
  networks: z.array(z.string().trim().min(1)).readonly().optional(),
})
export type TvSummary = z.infer<typeof tvSummarySchema>

export const seasonSchema = z.object({
  number: z.number().int().min(MIN_SEASON_NUMBER).max(MAX_SEASON_NUMBER),
  name: z.string().trim().min(1).optional(),
  airYear: z.number().int().min(MIN_PLAUSIBLE_YEAR).max(MAX_PLAUSIBLE_YEAR).optional(),
  episodeCount: z.number().int().nonnegative().optional(),
})
export type Season = z.infer<typeof seasonSchema>

export const episodeSchema = z
  .object({
    number: z.number().int().min(0).max(9999).optional(),
    name: z.string().trim().min(1).optional(),
    airDate: z.string().min(1).optional(),
    runtimeMinutes: z.number().int().positive().max(600).optional(),
    overview: z.string().trim().min(1).optional(),
    still: catalogPosterSchema.optional(),
    rating: titleRatingSchema.optional(),
  })
  .refine(
    (value) => value.number !== undefined || value.name !== undefined,
    'An episode needs a usable number or name'
  )
export type Episode = z.infer<typeof episodeSchema>

const castCreditSchema = z.object({
  name: z.string().trim().min(1),
  character: z.string().trim().min(1).optional(),
  profile: catalogPosterSchema.optional(),
})
export type CastCredit = z.infer<typeof castCreditSchema>

const crewCreditSchema = z.object({
  name: z.string().trim().min(1),
  role: crewRoleSchema,
  profile: catalogPosterSchema.optional(),
})
export type CrewCredit = z.infer<typeof crewCreditSchema>

export const creditsSchema = z.object({
  cast: z.array(castCreditSchema).readonly(),
  crew: z.array(crewCreditSchema).readonly(),
})
export type Credits = z.infer<typeof creditsSchema>

export const seasonEpisodesSchema = z.object({
  season: seasonSchema,
  episodes: z.array(episodeSchema).readonly(),
})
export type SeasonEpisodes = z.infer<typeof seasonEpisodesSchema>

export const relatedCollectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  items: z.array(catalogItemSchema).readonly(),
})
export type RelatedCollection = z.infer<typeof relatedCollectionSchema>

export const titleDetailSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().trim().min(1),
  originalTitle: z.string().trim().min(1).optional(),
  overview: z.string().trim().min(1).optional(),
  tagline: z.string().trim().min(1).optional(),
  releaseDate: z.string().min(1).optional(),
  releaseYear: z.number().int().min(MIN_PLAUSIBLE_YEAR).max(MAX_PLAUSIBLE_YEAR).optional(),
  status: titleStatusSchema.optional(),
  genres: z.array(genreSchema).readonly(),
  runtime: durationSchema.optional(),
  episodeRuntime: episodeDurationSchema.optional(),
  rating: titleRatingSchema.optional(),
  popularity: z.number().finite().positive().optional(),
  poster: catalogPosterSchema.optional(),
  backdrop: catalogPosterSchema.optional(),
  tvSummary: tvSummarySchema.optional(),
  seasons: z.array(seasonSchema).readonly().optional(),
  collection: z.object({ name: z.string().trim().min(1) }).optional(),
  trailer: z.object({ url: z.url(), site: z.literal('youtube') }).optional(),
})
export type TitleDetail = z.infer<typeof titleDetailSchema>

export const detailResponseMetaSchema = catalogResponseMetaSchema
export type DetailResponseMeta = CatalogResponseMeta

export const detailEnvelopeSchema = z.object({
  data: titleDetailSchema,
  meta: catalogResponseMetaSchema,
})
export type DetailEnvelope = z.infer<typeof detailEnvelopeSchema>

export const creditsEnvelopeSchema = z.object({
  data: creditsSchema,
  meta: catalogResponseMetaSchema,
})
export type CreditsEnvelope = z.infer<typeof creditsEnvelopeSchema>

export const relatedItemsEnvelopeSchema = z.object({
  data: z.object({ items: z.array(catalogItemSchema).readonly() }),
  meta: catalogResponseMetaSchema,
})
export type RelatedItemsEnvelope = z.infer<typeof relatedItemsEnvelopeSchema>

export const collectionEnvelopeSchema = z.object({
  data: relatedCollectionSchema,
  meta: catalogResponseMetaSchema,
})
export type CollectionEnvelope = z.infer<typeof collectionEnvelopeSchema>

export const seasonEnvelopeSchema = z.object({
  data: seasonEpisodesSchema,
  meta: catalogResponseMetaSchema,
})
export type SeasonEnvelope = z.infer<typeof seasonEnvelopeSchema>

export interface RelatedItemsData {
  readonly items: readonly CatalogItem[]
}

export type DetailImage = CatalogPoster

export const TITLE_STATUS_LABEL_KEYS: Readonly<Record<TitleStatus, string>> = Object.freeze({
  released: 'detail.status.released',
  'in-production': 'detail.status.inProduction',
  'post-production': 'detail.status.postProduction',
  planned: 'detail.status.planned',
  rumored: 'detail.status.rumored',
  returning: 'detail.status.returning',
  ended: 'detail.status.ended',
  canceled: 'detail.status.canceled',
  pilot: 'detail.status.pilot',
})

export const CREW_ROLE_LABEL_KEYS: Readonly<Record<CrewRole, string>> = Object.freeze({
  director: 'detail.crewRole.director',
  creator: 'detail.crewRole.creator',
  writer: 'detail.crewRole.writer',
})

export const titleStatusLabelKey = (status: TitleStatus): string => TITLE_STATUS_LABEL_KEYS[status]

export const crewRoleLabelKey = (role: CrewRole): string => CREW_ROLE_LABEL_KEYS[role]
