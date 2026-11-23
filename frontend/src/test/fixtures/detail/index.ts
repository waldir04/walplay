import type {
  CatalogItem,
  CatalogResponseMeta,
  CollectionEnvelope,
  CreditsEnvelope,
  DetailEnvelope,
  Episode,
  RelatedItemsEnvelope,
  Season,
  SeasonEnvelope,
  TitleDetail,
} from '@/entities/catalog'

import { MOVIE_ID, TV_ID, movieItem, providerMeta, secondMovieItem } from '../catalog'

export { MOVIE_ID, TV_ID }

export const TITLE_DETAIL_ID = MOVIE_ID
export const TV_DETAIL_ID = TV_ID

export const movieDetail = (overrides: Partial<TitleDetail> = {}): TitleDetail => ({
  id: MOVIE_ID,
  mediaType: 'movie',
  title: 'Fight Club',
  originalTitle: 'Fight Club',
  overview: 'A ticking-time-bomb insomniac and a slippery soap salesman.',
  tagline: 'Mischief. Mayhem. Soap.',
  releaseDate: '1999-10-15',
  releaseYear: 1999,
  status: 'released',
  genres: [
    { id: '18', name: 'Drama' },
    { id: '53', name: 'Thriller' },
  ],
  runtime: { minutes: 139, kind: 'movie' },
  rating: { value: 8.4, voteCount: 30_123, scale: 10, source: 'tmdb' },
  popularity: 63.421,
  poster: {
    url: 'https://image.example.test/w342/fight-club.jpg',
    urlLarge: 'https://image.example.test/w780/fight-club.jpg',
  },
  backdrop: {
    url: 'https://image.example.test/w780/backdrop.jpg',
    urlLarge: 'https://image.example.test/w1280/backdrop.jpg',
  },
  collection: { name: 'Fight Club Collection' },
  trailer: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', site: 'youtube' },
  ...overrides,
})

export const omittedMovieDetail = (): TitleDetail => ({
  id: 'd2wxOm1vdmllOjo5MDE',
  mediaType: 'movie',
  title: 'Minimal',
  genres: [],
})

export const tvSeasons = (): readonly Season[] => [
  { number: 1, name: 'Season 1', airYear: 2017, episodeCount: 10 },
  { number: 2, name: 'Season 2', airYear: 2019, episodeCount: 8 },
  { number: 0, name: 'Specials', airYear: 2018, episodeCount: 3 },
]

export const tvDetail = (overrides: Partial<TitleDetail> = {}): TitleDetail => ({
  id: TV_ID,
  mediaType: 'tv',
  title: 'Dark',
  overview: 'A missing child sets four families on a frantic hunt.',
  releaseDate: '2017-12-01',
  releaseYear: 2017,
  status: 'ended',
  genres: [{ id: '9648', name: 'Mystery' }],
  episodeRuntime: { minMinutes: 45, maxMinutes: 60 },
  rating: { value: 8.4, voteCount: 4210, scale: 10, source: 'tmdb' },
  popularity: 41.2,
  poster: { url: 'https://image.example.test/w342/dark.jpg' },
  tvSummary: {
    seasonsCount: 3,
    episodesCount: 21,
    firstAirDate: '2017-12-01',
    latestAirDate: '2020-06-27',
    networks: ['Netflix'],
  },
  seasons: tvSeasons(),
  ...overrides,
})

export const detailEnvelope = (
  detail: TitleDetail = movieDetail(),
  meta: Partial<CatalogResponseMeta> = {}
): DetailEnvelope => ({ data: detail, meta: providerMeta(meta) })

export const staleDetailEnvelope = (detail: TitleDetail = movieDetail()): DetailEnvelope =>
  detailEnvelope(detail, {
    stale: true,
    source: 'stale-cache',
    lastUpdatedAt: '2026-11-20T09:30:00.000Z',
  })

export const creditsEnvelope = (): CreditsEnvelope => ({
  data: {
    cast: [
      {
        name: 'Edward Norton',
        character: 'The Narrator',
        profile: { url: 'https://image.example.test/w185/norton.jpg' },
      },
      { name: 'Brad Pitt' },
    ],
    crew: [
      { name: 'David Fincher', role: 'director' },
      { name: 'Jim Uhls', role: 'writer' },
    ],
  },
  meta: providerMeta(),
})

export const emptyCreditsEnvelope = (): CreditsEnvelope => ({
  data: { cast: [], crew: [] },
  meta: providerMeta(),
})

export const relatedItems = (): readonly CatalogItem[] => [
  secondMovieItem(),
  movieItem({ id: 'd2wxOm1vdmllOjgwNw', title: 'Se7en', releaseYear: 1995 }),
]

export const similarEnvelope = (
  items: readonly CatalogItem[] = relatedItems()
): RelatedItemsEnvelope => ({
  data: { items },
  meta: providerMeta(),
})

export const collectionEnvelope = (
  items: readonly CatalogItem[] = relatedItems()
): CollectionEnvelope => ({
  data: { name: 'Fight Club Collection', items },
  meta: providerMeta(),
})

export const episodes = (): readonly Episode[] => [
  {
    number: 1,
    name: 'Secrets',
    airDate: '2017-12-01',
    runtimeMinutes: 51,
    overview: 'In 2019, a man disappears.',
    still: { url: 'https://image.example.test/w300/still-1.jpg' },
    rating: { value: 8.1, voteCount: 820, scale: 10, source: 'tmdb' },
  },
  {
    number: 2,
    name: 'Lies',
    airDate: '2017-12-01',
    runtimeMinutes: 45,
  },
]

export const seasonEnvelope = (seasonNumber = 1): SeasonEnvelope => ({
  data: {
    season: {
      number: seasonNumber,
      name: `Season ${seasonNumber}`,
      airYear: 2017,
      episodeCount: 2,
    },
    episodes: episodes(),
  },
  meta: providerMeta(),
})

export const emptySeasonEnvelope = (seasonNumber = 1): SeasonEnvelope => ({
  data: {
    season: { number: seasonNumber, name: `Season ${seasonNumber}`, episodeCount: 0 },
    episodes: [],
  },
  meta: providerMeta(),
})

export const staleSeasonEnvelope = (seasonNumber = 1): SeasonEnvelope => ({
  data: {
    season: { number: seasonNumber, name: `Season ${seasonNumber}`, episodeCount: 2 },
    episodes: episodes(),
  },
  meta: providerMeta({ stale: true, source: 'stale-cache' }),
})

export const DETAIL_ERROR_CODES = {
  notFound: 'CATALOG_NOT_FOUND',
  seasonNotFound: 'DETAIL_SEASON_NOT_FOUND',
  unavailable: 'CATALOG_UNAVAILABLE',
} as const
