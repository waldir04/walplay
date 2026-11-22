import { z } from 'zod'

const nullableString = z.string().nullish()
const nullableNumber = z.number().nullish()

export const multiSearchItemSchema = z.object({
  id: nullableNumber,
  media_type: nullableString,
  title: nullableString,
  name: nullableString,
  original_title: nullableString,
  original_name: nullableString,
  release_date: nullableString,
  first_air_date: nullableString,
  poster_path: nullableString,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  genre_ids: z.array(z.number()).nullish(),
})

export const multiSearchResponseSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(multiSearchItemSchema),
  total_pages: z.number().int().nonnegative().optional(),
  total_results: z.number().int().nonnegative().optional(),
})

export type MultiSearchItem = z.infer<typeof multiSearchItemSchema>
export type MultiSearchResponse = z.infer<typeof multiSearchResponseSchema>
