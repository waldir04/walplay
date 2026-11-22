import { z } from 'zod'

import type { MediaType, ProviderReference } from '../domain/catalog.js'

const ITEM_ID_PREFIX = 'wl1'
const MAX_TOKEN_LENGTH = 64

export const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

const decodedSchema = z
  .object({
    prefix: z.literal(ITEM_ID_PREFIX),
    mediaType: z.enum(['movie', 'tv']),
    providerId: z
      .string()
      .regex(/^\d{1,12}$/)
      .transform((value) => Number.parseInt(value, 10))
      .refine((value) => Number.isSafeInteger(value) && value > 0),
  })
  .strict()

export const encodeItemId = (mediaType: MediaType, providerId: number): string => {
  if (!Number.isSafeInteger(providerId) || providerId <= 0) {
    throw new Error('Provider id must be a positive safe integer.')
  }
  return Buffer.from(`${ITEM_ID_PREFIX}:${mediaType}:${providerId}`, 'utf8').toString('base64url')
}

export const decodeItemId = (token: string): ProviderReference => {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH || !ITEM_ID_PATTERN.test(token)) {
    throw new Error('Invalid catalog item identifier.')
  }

  let decoded: string
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    throw new Error('Invalid catalog item identifier.')
  }

  const [prefix, mediaType, providerId, ...rest] = decoded.split(':')
  const result = decodedSchema.safeParse({
    prefix,
    mediaType,
    providerId,
  })

  if (!result.success || rest.length > 0) {
    throw new Error('Invalid catalog item identifier.')
  }

  return {
    provider: 'tmdb',
    mediaType: result.data.mediaType,
    providerId: result.data.providerId,
  }
}
