import type {
  CatalogItem,
  CatalogPage,
  CatalogResponseMeta,
  CatalogSectionCapability,
  SectionId,
} from '@/entities/catalog'

export const MOVIE_ID = 'd2wxOm1vdmllOjU1MA'
export const SECOND_MOVIE_ID = 'd2wxOm1vdmllOjY4MA'
export const THIRD_MOVIE_ID = 'd2wxOm1vdmllOjEz'
export const TV_ID = 'd2wxOnR2OjEzOTk'
export const UNKNOWN_ID = 'd2wxOm1vdmllOjk5OQ'

export const CAPABILITIES: readonly CatalogSectionCapability[] = [
  { id: 'trending', order: 1, mediaTypes: ['movie', 'tv'], paginated: false },
  { id: 'popular', order: 2, mediaTypes: ['movie', 'tv'], paginated: true },
  { id: 'top-rated', order: 3, mediaTypes: ['movie', 'tv'], paginated: true },
]

export const providerMeta = (
  overrides: Partial<CatalogResponseMeta> = {}
): CatalogResponseMeta => ({
  language: 'en-US',
  stale: false,
  lastUpdatedAt: '2026-11-22T15:00:00.000Z',
  source: 'provider',
  ...overrides,
})

export const movieItem = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id: MOVIE_ID,
  mediaType: 'movie',
  title: 'Fight Club',
  originalTitle: 'Fight Club',
  releaseYear: 1999,
  rating: { value: 8.4, voteCount: 30_123, scale: 10 },
  genres: [{ id: '18', name: 'Drama' }],
  poster: {
    url: 'https://image.example.test/w342/fight-club.jpg',
    urlLarge: 'https://image.example.test/w780/fight-club.jpg',
  },
  ...overrides,
})

export const secondMovieItem = (): CatalogItem =>
  movieItem({
    id: SECOND_MOVIE_ID,
    title: 'Arrival',
    originalTitle: 'Arrival',
    releaseYear: 2016,
  })

export const thirdMovieItem = (): CatalogItem =>
  movieItem({
    id: THIRD_MOVIE_ID,
    title: 'Moon',
    originalTitle: 'Moon',
    releaseYear: 2009,
  })

export const tvItem = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id: TV_ID,
  mediaType: 'tv',
  title: 'Example Show',
  releaseYear: 2011,
  rating: { value: 9.1, voteCount: 900, scale: 10 },
  genres: [],
  ...overrides,
})

export const catalogPage = (input: {
  readonly items: readonly CatalogItem[]
  readonly page?: number
  readonly section?: SectionId
  readonly hasMore?: boolean
  readonly totalPages?: number
}): CatalogPage => ({
  mediaType: input.items[0]?.mediaType ?? 'movie',
  section: input.section ?? 'popular',
  page: input.page ?? 1,
  items: input.items,
  hasMore: input.hasMore ?? false,
  ...(input.totalPages === undefined ? {} : { totalPages: input.totalPages }),
  totalResults: input.totalPages === undefined ? undefined : input.totalPages * 20,
})

export const pageEnvelope = (input: {
  readonly items: readonly CatalogItem[]
  readonly page?: number
  readonly section?: SectionId
  readonly hasMore?: boolean
  readonly totalPages?: number
  readonly stale?: boolean
}) => ({
  data: catalogPage(input),
  meta: providerMeta(input.stale ? { stale: true, source: 'stale-cache' } : {}),
})

export const capabilitiesEnvelope = () => ({
  data: { sections: CAPABILITIES },
})

export const errorEnvelope = (code: string) => ({
  error: { code, message: 'Failure' },
})
