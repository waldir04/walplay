import { z } from 'zod'

import type { InterfaceLanguage } from './catalogLanguage'

export const TRAILER_TYPE_ORDER = [
  'trailer',
  'teaser',
  'featurette',
  'clip',
  'behind-the-scenes',
  'bloopers',
] as const

export const promotionalTypeSchema = z.enum(TRAILER_TYPE_ORDER)
export type PromotionalType = z.infer<typeof promotionalTypeSchema>

export const TRAILER_MAX_VISIBLE = 6
export const TRAILER_MAX_INVENTORY = 24

export const TRAILER_TYPE_RANK: Readonly<Record<PromotionalType, number>> = Object.freeze({
  trailer: 0,
  teaser: 1,
  featurette: 2,
  clip: 3,
  'behind-the-scenes': 4,
  bloopers: 5,
})

const httpsUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'must be an https URL')

const timestampSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a parseable timestamp')

export const trailerVideoSchema = z
  .strictObject({
    id: z.string().regex(/^youtube:[A-Za-z0-9_-]{11}$/),
    platform: z.literal('youtube'),
    platformName: z.string().trim().min(1),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1),
    type: promotionalTypeSchema,
    official: z.boolean(),
    language: z
      .string()
      .regex(/^[a-z]{2}$/)
      .optional(),
    publishedAt: timestampSchema.optional(),
    embedUrl: httpsUrlSchema.optional(),
    externalUrl: httpsUrlSchema.optional(),
  })
  .refine(
    (video) => video.embedUrl !== undefined || video.externalUrl !== undefined,
    'a video needs at least one authorized destination'
  )
export type TrailerVideo = z.infer<typeof trailerVideoSchema>

export const availableTrailersDataSchema = z.strictObject({
  state: z.literal('available'),
  videos: z.array(trailerVideoSchema).min(1).readonly(),
})
export const noVideosTrailersDataSchema = z.strictObject({
  state: z.literal('no-videos'),
  videos: z.array(trailerVideoSchema).length(0).readonly(),
})
export const trailersDataSchema = z.discriminatedUnion('state', [
  availableTrailersDataSchema,
  noVideosTrailersDataSchema,
])
export type TrailersData = z.infer<typeof trailersDataSchema>
export type AvailableTrailersData = z.infer<typeof availableTrailersDataSchema>
export type NoVideosTrailersData = z.infer<typeof noVideosTrailersDataSchema>

export const trailerMetaSchema = z.strictObject({
  stale: z.boolean(),
  lastUpdatedAt: timestampSchema,
  source: z.enum(['provider', 'cache', 'stale-cache']),
  freshness: z.enum(['current', 'stale']),
})
export type TrailerMeta = z.infer<typeof trailerMetaSchema>

export const trailerEnvelopeSchema = z.union([
  z.strictObject({ data: availableTrailersDataSchema, meta: trailerMetaSchema }),
  z.strictObject({ data: noVideosTrailersDataSchema, meta: trailerMetaSchema }),
])
export type TrailerEnvelope = z.infer<typeof trailerEnvelopeSchema>

export type TrailerPlaybackMode = 'embedded' | 'external'

export type TrailerPlaybackStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'external-only'

export type PlayerUnavailableReason = 'player-timeout' | 'width-too-small'

export interface TrailerPlaybackSession {
  readonly selectedVideoId: string | undefined
  readonly activeVideoId: string | null
  readonly status: TrailerPlaybackStatus
  readonly reason: PlayerUnavailableReason | null
}

const languageRank = (video: TrailerVideo, language: InterfaceLanguage): number =>
  video.language === language ? 0 : 1

export const rankTrailerVideos = (
  videos: readonly TrailerVideo[],
  language: InterfaceLanguage
): readonly TrailerVideo[] =>
  videos
    .map((video, index) => ({ video, index }))
    .sort((left, right) => {
      const byType = TRAILER_TYPE_RANK[left.video.type] - TRAILER_TYPE_RANK[right.video.type]
      if (byType !== 0) {
        return byType
      }
      if (left.video.official !== right.video.official) {
        return left.video.official ? -1 : 1
      }
      const byLanguage = languageRank(left.video, language) - languageRank(right.video, language)
      if (byLanguage !== 0) {
        return byLanguage
      }
      return left.index - right.index
    })
    .map((entry) => entry.video)

export const playbackModeFor = (video: TrailerVideo, canEmbed: boolean): TrailerPlaybackMode =>
  video.embedUrl !== undefined && canEmbed ? 'embedded' : 'external'
