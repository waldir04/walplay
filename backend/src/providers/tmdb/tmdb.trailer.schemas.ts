import { z } from 'zod'

const nullableString = z.string().nullish()
const nullableNumber = z.number().nullish()

export const tmdbTrailerRecordDto = z.object({
  id: nullableString,
  iso_639_1: nullableString,
  iso_3166_1: nullableString,
  name: nullableString,
  key: nullableString,
  site: nullableString,
  size: nullableNumber,
  type: nullableString,
  official: z.boolean().nullish(),
  published_at: nullableString,
})

export const tmdbTrailerDto = z.object({
  id: z.number(),
  results: z.array(tmdbTrailerRecordDto).nullish(),
})
