import { z } from 'zod'

const nullableString = z.string().nullish()
const nullableNumber = z.number().nullish()
const imagePath = z.string().nullish()

export const detailGenreDto = z.object({
  id: z.number(),
  name: z.string(),
})

const collectionRefDto = z.object({
  id: z.number(),
  name: nullableString,
})

const networkDto = z.object({
  id: nullableNumber,
  name: nullableString,
})

export const seasonSummaryDto = z.object({
  season_number: nullableNumber,
  name: nullableString,
  air_date: nullableString,
  episode_count: nullableNumber,
  poster_path: imagePath,
  overview: nullableString,
})

export const movieDetailDto = z.object({
  id: z.number(),
  title: nullableString,
  original_title: nullableString,
  overview: nullableString,
  tagline: nullableString,
  release_date: nullableString,
  original_language: nullableString,
  poster_path: imagePath,
  backdrop_path: imagePath,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  popularity: nullableNumber,
  runtime: nullableNumber,
  status: nullableString,
  genres: z.array(detailGenreDto).nullish(),
  belongs_to_collection: collectionRefDto.nullish(),
})

export const tvDetailDto = z.object({
  id: z.number(),
  name: nullableString,
  original_name: nullableString,
  overview: nullableString,
  tagline: nullableString,
  first_air_date: nullableString,
  last_air_date: nullableString,
  original_language: nullableString,
  poster_path: imagePath,
  backdrop_path: imagePath,
  adult: z.boolean().nullish(),
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  popularity: nullableNumber,
  episode_run_time: z.array(z.number()).nullish(),
  status: nullableString,
  genres: z.array(detailGenreDto).nullish(),
  number_of_seasons: nullableNumber,
  number_of_episodes: nullableNumber,
  seasons: z.array(seasonSummaryDto).nullish(),
  networks: z.array(networkDto).nullish(),
})

export const creditsDto = z.object({
  cast: z
    .array(
      z.object({
        id: z.number(),
        name: nullableString,
        character: nullableString,
        order: nullableNumber,
        profile_path: imagePath,
      })
    )
    .nullish(),
  crew: z
    .array(
      z.object({
        id: z.number(),
        name: nullableString,
        job: nullableString,
        department: nullableString,
        profile_path: imagePath,
      })
    )
    .nullish(),
})

export const aggregateCreditsDto = z.object({
  cast: z
    .array(
      z.object({
        id: z.number(),
        name: nullableString,
        order: nullableNumber,
        roles: z.array(z.object({ character: nullableString })).nullish(),
        profile_path: imagePath,
      })
    )
    .nullish(),
  crew: z
    .array(
      z.object({
        id: z.number(),
        name: nullableString,
        jobs: z.array(z.object({ job: nullableString })).nullish(),
        profile_path: imagePath,
      })
    )
    .nullish(),
})

export const similarDto = z.object({
  page: nullableNumber,
  results: z.array(
    z.object({
      id: z.number(),
      media_type: z.string().nullish(),
      title: nullableString,
      name: nullableString,
      original_title: nullableString,
      original_name: nullableString,
      release_date: nullableString,
      first_air_date: nullableString,
      poster_path: imagePath,
      adult: z.boolean().nullish(),
      vote_average: nullableNumber,
      vote_count: nullableNumber,
      genre_ids: z.array(z.number()).nullish(),
    })
  ),
})

export const collectionDto = z.object({
  id: z.number(),
  name: nullableString,
  parts: z
    .array(
      z.object({
        id: z.number(),
        title: nullableString,
        original_title: nullableString,
        release_date: nullableString,
        poster_path: imagePath,
        adult: z.boolean().nullish(),
        vote_average: nullableNumber,
        vote_count: nullableNumber,
        genre_ids: z.array(z.number()).nullish(),
      })
    )
    .nullish(),
})

export const seasonEpisodeDto = z.object({
  episode_number: nullableNumber,
  name: nullableString,
  air_date: nullableString,
  runtime: nullableNumber,
  overview: nullableString,
  still_path: imagePath,
  vote_average: nullableNumber,
  vote_count: nullableNumber,
})

export const seasonDto = z.object({
  id: z.number().nullish(),
  name: nullableString,
  season_number: nullableNumber,
  air_date: nullableString,
  poster_path: imagePath,
  overview: nullableString,
  episodes: z.array(seasonEpisodeDto).nullish(),
})

export type MovieDetailDto = z.infer<typeof movieDetailDto>
export type TvDetailDto = z.infer<typeof tvDetailDto>
export type CreditsDto = z.infer<typeof creditsDto>
export type AggregateCreditsDto = z.infer<typeof aggregateCreditsDto>
export type SimilarDto = z.infer<typeof similarDto>
export type CollectionDto = z.infer<typeof collectionDto>
export type SeasonDto = z.infer<typeof seasonDto>
export type SeasonEpisodeDto = z.infer<typeof seasonEpisodeDto>
