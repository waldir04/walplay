import type { TmdbMovieListItem, TmdbTvListItem } from './types.js'

export const movieListItem = (overrides: Partial<TmdbMovieListItem> = {}): TmdbMovieListItem => ({
  id: 550,
  title: 'Fight Club',
  original_title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/fight-club.jpg',
  adult: false,
  vote_average: 8.4,
  vote_count: 100,
  genre_ids: [18],
  ...overrides,
})

export const tvListItem = (overrides: Partial<TmdbTvListItem> = {}): TmdbTvListItem => ({
  id: 1399,
  name: 'Example Show',
  original_name: 'Example Show',
  first_air_date: '2011-04-17',
  poster_path: '/show.jpg',
  adult: false,
  vote_average: 9,
  vote_count: 200,
  genre_ids: [18],
  ...overrides,
})

export const malformedListItem = { id: 'not-a-number', title: 42 }
