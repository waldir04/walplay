export interface TmdbMovieListItem {
  readonly id: number
  readonly title?: string | null
  readonly original_title?: string | null
  readonly release_date?: string | null
  readonly poster_path?: string | null
  readonly adult?: boolean | null
  readonly vote_average?: number | null
  readonly vote_count?: number | null
  readonly genre_ids?: readonly number[] | null
}

export interface TmdbTvListItem {
  readonly id: number
  readonly name?: string | null
  readonly original_name?: string | null
  readonly first_air_date?: string | null
  readonly poster_path?: string | null
  readonly adult?: boolean | null
  readonly vote_average?: number | null
  readonly vote_count?: number | null
  readonly genre_ids?: readonly number[] | null
}
