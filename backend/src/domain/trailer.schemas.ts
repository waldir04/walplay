import { z } from 'zod'

import {
  YOUTUBE_VIDEO_ID_PATTERN,
} from './trailer.js'

const httpsUrlSchema = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}, 'must be an https URL')

const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a parseable timestamp')

const promotionalTypeSchema = z.enum([
  'trailer',
  'teaser',
  'featurette',
  'clip',
  'behind-the-scenes',
  'bloopers',
])

export const trailerVideoSchema = z
  .strictObject({
    id: z.string().regex(/^youtube:[A-Za-z0-9_-]{11}$/),
    platform: z.literal('youtube'),
    platformName: z.string().trim().min(1),
    videoId: z.string().regex(YOUTUBE_VIDEO_ID_PATTERN),
    title: z.string().trim().min(1),
    type: promotionalTypeSchema,
    official: z.boolean(),
    language: z.string().regex(/^[a-z]{2}$/).optional(),
    publishedAt: isoDateTimeSchema.optional(),
    embedUrl: httpsUrlSchema.optional(),
    externalUrl: httpsUrlSchema.optional(),
  })
  .refine(
    (video) => video.embedUrl !== undefined || video.externalUrl !== undefined,
    'a video needs at least one authorized destination'
  )

export const trailerMetaSchema = z.strictObject({
  stale: z.boolean(),
  lastUpdatedAt: isoDateTimeSchema,
  source: z.enum(['provider', 'cache', 'stale-cache']),
  freshness: z.enum(['current', 'stale']),
})

export const availableTrailerInventorySchema = z.strictObject({
  state: z.literal('available'),
  videos: z.array(trailerVideoSchema).min(1),
})

export const noVideosInventorySchema = z.strictObject({
  state: z.literal('no-videos'),
  videos: z.array(trailerVideoSchema).length(0),
})

export const trailerInventorySchema = z.discriminatedUnion('state', [
  availableTrailerInventorySchema,
  noVideosInventorySchema,
])

const withMeta = <T extends z.ZodType>(data: T) =>
  z.strictObject({ data, meta: trailerMetaSchema })

export const availableTrailerEnvelopeSchema = withMeta(availableTrailerInventorySchema)
export const noVideosTrailerEnvelopeSchema = withMeta(noVideosInventorySchema)

export const trailerEnvelopeSchema = z.union([
  availableTrailerEnvelopeSchema,
  noVideosTrailerEnvelopeSchema,
])
