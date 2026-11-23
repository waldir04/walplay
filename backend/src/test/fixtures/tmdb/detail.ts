import { ProviderHttpError } from '../../../providers/tmdb/tmdb.errors.js'
import type {
  AggregateCreditsDto,
  CollectionDto,
  CreditsDto,
  MovieDetailDto,
  SeasonDto,
  SimilarDto,
  TvDetailDto,
} from '../../../providers/tmdb/tmdb.detail.schemas.js'

const trailer = (overrides: Record<string, unknown> = {}) => ({
  site: 'YouTube',
  type: 'Trailer',
  key: 'dQw4w9WgXcQ',
  official: true,
  ...overrides,
})

export const completeMovieDetail = (
  overrides: Partial<MovieDetailDto> = {}
): MovieDetailDto => ({
  id: 550,
  title: 'Fight Club',
  original_title: 'Fight Club',
  overview: 'A ticking-time-bomb insomniac and a slippery soap salesman.',
  tagline: 'Mischief. Mayhem. Soap.',
  release_date: '1999-10-15',
  original_language: 'en',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  adult: false,
  vote_average: 8.4,
  vote_count: 30_123,
  popularity: 63.421,
  runtime: 139,
  status: 'Released',
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  belongs_to_collection: { id: 100, name: 'Fight Club Collection' },
  videos: { results: [trailer()] },
  ...overrides,
})

export const completeTvDetail = (overrides: Partial<TvDetailDto> = {}): TvDetailDto => ({
  id: 213,
  name: 'Dark',
  original_name: 'Dark',
  overview: 'A missing child sets four families on a frantic hunt.',
  tagline: '',
  first_air_date: '2017-12-01',
  last_air_date: '2020-06-27',
  original_language: 'de',
  poster_path: '/tv-poster.jpg',
  backdrop_path: '/tv-backdrop.jpg',
  adult: false,
  vote_average: 8.4,
  vote_count: 4210,
  popularity: 41.2,
  episode_run_time: [45, 60],
  status: 'Ended',
  genres: [{ id: 9648, name: 'Mystery' }],
  number_of_seasons: 3,
  number_of_episodes: 26,
  seasons: [
    {
      season_number: 1,
      name: 'Season 1',
      air_date: '2017-12-01',
      episode_count: 10,
      poster_path: '/season1.jpg',
      overview: '',
    },
    {
      season_number: 2,
      name: 'Season 2',
      air_date: '2019-06-21',
      episode_count: 8,
      poster_path: '/season2.jpg',
      overview: '',
    },
    {
      season_number: 3,
      name: 'Season 3',
      air_date: '2020-06-27',
      episode_count: 8,
      poster_path: '/season3.jpg',
      overview: '',
    },
    {
      season_number: 0,
      name: 'Specials',
      air_date: '2018-01-01',
      episode_count: 3,
      poster_path: '/specials.jpg',
      overview: '',
    },
  ],
  networks: [{ id: 213, name: 'Netflix' }],
  videos: { results: [trailer({ key: 'abcdef12345' })] },
  ...overrides,
})

export const minimalMovieDetail = (): MovieDetailDto => ({
  id: 900,
  title: 'Minimal',
  original_title: 'Minimal',
})

export const emptyStringMovieDetail = (): MovieDetailDto => ({
  id: 901,
  title: '   ',
  original_title: 'Original Only',
  overview: '   ',
  tagline: '',
  release_date: '',
  poster_path: '',
  backdrop_path: '',
  status: '',
  genres: [],
  runtime: 0,
  vote_average: 0,
  vote_count: 0,
  popularity: 0,
  videos: { results: [] },
})

export const zeroNumericMovieDetail = (): MovieDetailDto => ({
  id: 902,
  title: 'Zeros',
  original_title: 'Zeros',
  runtime: 0,
  vote_average: 0,
  vote_count: 0,
  popularity: -3,
  release_date: '0000-00-00',
  genres: [{ id: 1, name: '   ' }],
})

export const adultMovieDetail = (): MovieDetailDto => completeMovieDetail({ adult: true })

export const placeholderMovieDetail = (): MovieDetailDto =>
  completeMovieDetail({
    title: 'N/A',
    original_title: 'tbd',
    overview: 'N/A',
    tagline: 'Unknown',
    status: 'not-a-status',
    genres: [{ id: 1, name: 'N/A' }],
  })

export const originalLanguageOnlyTv = (): TvDetailDto =>
  completeTvDetail({ overview: '', original_language: 'de' })

export const movieCredits = (overrides: Partial<CreditsDto> = {}): CreditsDto => ({
  cast: [
    { id: 1, name: 'Edward Norton', character: 'The Narrator', order: 0, profile_path: '/n.jpg' },
    { id: 2, name: 'Brad Pitt', character: 'Tyler Durden', order: 1, profile_path: '/p.jpg' },
    { id: 3, name: 'Helena Bonham Carter', character: '', order: 2, profile_path: null },
  ],
  crew: [
    { id: 4, name: 'David Fincher', job: 'Director', department: 'Directing', profile_path: '/f.jpg' },
    { id: 5, name: 'Jim Uhls', job: 'Screenplay', department: 'Writing', profile_path: null },
    { id: 6, name: 'Unmapped Person', job: 'Gaffer', department: 'Lighting', profile_path: null },
  ],
  ...overrides,
})

export const tvAggregateCredits = (
  overrides: Partial<AggregateCreditsDto> = {}
): AggregateCreditsDto => ({
  cast: [
    {
      id: 7,
      name: 'Louis Hofmann',
      order: 0,
      roles: [{ character: 'Jonas Kahnwald' }, { character: 'The Stranger' }],
      profile_path: '/lh.jpg',
    },
    { id: 8, name: 'No Role', order: 1, roles: [], profile_path: null },
  ],
  crew: [
    { id: 9, name: 'Baran bo Odar', jobs: [{ job: 'Director' }, { job: 'Writer' }], profile_path: '/b.jpg' },
    { id: 10, name: 'Jantje Friese', jobs: [{ job: 'Creator' }], profile_path: null },
  ],
  ...overrides,
})

export const largeMovieCredits = (): CreditsDto => ({
  cast: Array.from({ length: 24 }, (_, index) => ({
    id: index + 1,
    name: `Performer ${index + 1}`,
    character: `Character ${index + 1}`,
    order: index,
    profile_path: null,
  })),
  crew: Array.from({ length: 14 }, (_, index) => ({
    id: index + 100,
    name: `Crew ${index + 1}`,
    job: index % 2 === 0 ? 'Director' : 'Writer',
    department: 'Directing',
    profile_path: null,
  })),
})

const similarItem = (id: number, mediaType: 'movie' | 'tv', title: string) => ({
  id,
  media_type: mediaType,
  title: mediaType === 'movie' ? title : null,
  name: mediaType === 'tv' ? title : null,
  original_title: title,
  original_name: title,
  release_date: '1995-09-22',
  first_air_date: null,
  poster_path: `/similar-${id}.jpg`,
  adult: false,
  vote_average: 8,
  vote_count: 100,
  genre_ids: [80],
})

export const completeSimilar = (overrides: Partial<SimilarDto> = {}): SimilarDto => ({
  page: 1,
  results: [
    similarItem(550, 'movie', 'Fight Club'),
    similarItem(745, 'movie', 'Se7en'),
    similarItem(745, 'movie', 'Se7en Duplicate'),
    similarItem(999, 'tv', 'Wrong Type'),
    { ...similarItem(1000, 'movie', 'Adult'), adult: true },
  ],
  ...overrides,
})

export const largeSimilar = (): SimilarDto => ({
  page: 1,
  results: [
    similarItem(550, 'movie', 'Current'),
    ...Array.from({ length: 30 }, (_, index) =>
      similarItem(2000 + index, 'movie', `Similar ${index + 1}`)
    ),
  ],
})

export const completeCollection = (overrides: Partial<CollectionDto> = {}): CollectionDto => ({
  id: 100,
  name: 'The Matrix Collection',
  parts: [
    {
      id: 603,
      title: 'The Matrix',
      original_title: 'The Matrix',
      release_date: '1999-03-30',
      poster_path: '/matrix.jpg',
      adult: false,
      vote_average: 8.2,
      vote_count: 20_000,
      genre_ids: [28],
    },
    {
      id: 604,
      title: 'The Matrix Reloaded',
      original_title: 'The Matrix Reloaded',
      release_date: '2003-05-15',
      poster_path: '/reloaded.jpg',
      adult: false,
      vote_average: 7.1,
      vote_count: 12_000,
      genre_ids: [28],
    },
  ],
  ...overrides,
})

const episode = (number: number) => ({
  episode_number: number,
  name: `Episode ${number}`,
  air_date: '2017-12-01',
  runtime: 51,
  overview: 'In 2019, a man disappears.',
  still_path: `/still-${number}.jpg`,
  vote_average: 8.1,
  vote_count: 820,
})

export const completeSeason = (overrides: Partial<SeasonDto> = {}): SeasonDto => ({
  id: 1000,
  name: 'Season 1',
  season_number: 1,
  air_date: '2017-12-01',
  poster_path: '/season1.jpg',
  overview: 'Season overview.',
  episodes: [episode(1), episode(2), episode(3)],
  ...overrides,
})

export const largeSeason = (): SeasonDto => ({
  id: 1002,
  name: 'Season 2',
  season_number: 2,
  air_date: '2019-06-21',
  poster_path: '/season2.jpg',
  overview: '',
  episodes: Array.from({ length: 60 }, (_, index) => episode(index + 1)),
})

export const largeTvDetail = (): TvDetailDto =>
  completeTvDetail({
    number_of_seasons: 40,
    seasons: Array.from({ length: 40 }, (_, index) => ({
      season_number: index + 1,
      name: `Season ${index + 1}`,
      air_date: '2019-06-21',
      episode_count: 10,
      poster_path: null,
      overview: '',
    })),
  })

export const malformedMovieDetail = (): Record<string, unknown> => ({
  id: 'not-a-number',
  title: { nested: true },
  genres: 'not-an-array',
})

export const provider404 = (): ProviderHttpError => new ProviderHttpError(404)

export const provider500 = (): ProviderHttpError => new ProviderHttpError(500)
