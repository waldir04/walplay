import { z } from 'zod'

const nullableString = z.string().nullish()
const nullableNumber = z.number().nullish()

export const movieListItemSchema = z.object({
  id: z.number().int().positive(),
  title: nullableString,
  original_title: nullableString,
  release_date: nullableString,
  poster_path: nullableString,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  genre_ids: z.array(z.number().int()).nullish(),
})

export const tvListItemSchema = z.object({
  id: z.number().int().positive(),
  name: nullableString,
  original_name: nullableString,
  first_air_date: nullableString,
  poster_path: nullableString,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  genre_ids: z.array(z.number().int()).nullish(),
})

export const createListResponseSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    page: z.number().int().positive(),
    results: z.array(item),
    total_pages: z.number().int().nonnegative().optional(),
    total_results: z.number().int().nonnegative().optional(),
  })

export const movieListResponseSchema = createListResponseSchema(movieListItemSchema)
export const tvListResponseSchema = createListResponseSchema(tvListItemSchema)

export const genreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
})

export const genreListResponseSchema = z.object({
  genres: z.array(genreSchema),
})

export const movieDetailSchema = z.object({
  id: z.number().int().positive(),
  title: nullableString,
  original_title: nullableString,
  release_date: nullableString,
  poster_path: nullableString,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  genres: z.array(genreSchema).nullish(),
})

export const tvDetailSchema = z.object({
  id: z.number().int().positive(),
  name: nullableString,
  original_name: nullableString,
  first_air_date: nullableString,
  poster_path: nullableString,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  genres: z.array(genreSchema).nullish(),
})

export const imageConfigurationSchema = z.object({
  images: z.object({
    secure_base_url: z.url(),
    poster_sizes: z.array(z.string()),
  }),
})

export type MovieListItem = z.infer<typeof movieListItemSchema>
export type TvListItem = z.infer<typeof tvListItemSchema>
export type MovieDetail = z.infer<typeof movieDetailSchema>
export type TvDetail = z.infer<typeof tvDetailSchema>
export type GenreListResponse = z.infer<typeof genreListResponseSchema>
export type ImageConfiguration = z.infer<typeof imageConfigurationSchema>
export type MovieListResponse = z.infer<typeof movieListResponseSchema>
export type TvListResponse = z.infer<typeof tvListResponseSchema>
