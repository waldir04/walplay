import { describe, expect, it, vi } from 'vitest'

import { encodeItemId } from '../../lib/itemId.js'
import { mapSearchItemToItem, mapSearchResultsToItems } from './tmdb.search.mapper.js'
import type { MultiSearchItem } from './tmdb.search.schemas.js'

const genres = {
  movie: new Map([
    [18, 'Drama'],
    [28, 'Action'],
  ]),
  tv: new Map([
    [18, 'Drama'],
    [10765, 'Sci-Fi & Fantasy'],
  ]),
}

const poster = vi.fn((path: string | null | undefined) =>
  typeof path === 'string' && path.length > 0
    ? { url: `https://image.example.test/w342${path}`, urlLarge: `https://image.example.test/w780${path}` }
    : undefined
)
const context = { genreNamesByMediaType: genres, poster }

const movie = (overrides: Partial<MultiSearchItem> = {}): MultiSearchItem => ({
  id: 550,
  media_type: 'movie',
  title: 'Fight Club',
  original_title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/fight-club.jpg',
  adult: false,
  vote_average: 8.44,
  vote_count: 30_123,
  genre_ids: [18, 28, 9999],
  ...overrides,
})

const tv = (overrides: Partial<MultiSearchItem> = {}): MultiSearchItem => ({
  id: 1399,
  media_type: 'tv',
  name: 'Example Show',
  original_name: 'Example Show',
  first_air_date: '2011-04-17',
  poster_path: '/show.jpg',
  adult: false,
  vote_average: 9.1,
  vote_count: 900,
  genre_ids: [18, 10765],
  ...overrides,
})

describe('search mapper', () => {
  it('maps a movie item with localized genres, rating, year, poster, and opaque id', () => {
    const item = mapSearchItemToItem(movie(), context)

    expect(item).toMatchObject({
      id: encodeItemId('movie', 550),
      mediaType: 'movie',
      title: 'Fight Club',
      releaseYear: 1999,
      rating: { value: 8.4, voteCount: 30_123, scale: 10 },
      genres: [
        { id: '18', name: 'Drama' },
        { id: '28', name: 'Action' },
      ],
      poster: { url: 'https://image.example.test/w342/fight-club.jpg' },
    })
    expect(item?.id).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('maps a TV item using name fields and the TV genre map', () => {
    const item = mapSearchItemToItem(tv(), context)

    expect(item).toMatchObject({
      mediaType: 'tv',
      title: 'Example Show',
      releaseYear: 2011,
      genres: [
        { id: '18', name: 'Drama' },
        { id: '10765', name: 'Sci-Fi & Fantasy' },
      ],
    })
  })

  it('drops adult results', () => {
    expect(mapSearchItemToItem(movie({ adult: true }), context)).toBeNull()
  })

  it('drops non-movie and non-tv media types, including person and missing values', () => {
    for (const mediaType of ['person', 'collection', 'unknown', undefined]) {
      expect(mapSearchItemToItem(movie({ media_type: mediaType }), context)).toBeNull()
    }
  })

  it('drops missing, non-positive, and non-integer provider ids', () => {
    for (const id of [undefined, null, 0, -1, 1.5]) {
      expect(mapSearchItemToItem(movie({ id }), context)).toBeNull()
    }
  })

  it('falls back from a missing localized title to the original title and drops when both fail', () => {
    expect(mapSearchItemToItem(movie({ title: '   ', original_title: 'Original' }), context)).toEqual(
      expect.objectContaining({ title: 'Original' })
    )
    expect(mapSearchItemToItem(movie({ title: null, original_title: null }), context)).toBeNull()
    expect(mapSearchItemToItem(tv({ name: '', original_name: 'Ö' }), context)).toMatchObject({
      title: 'Ö',
    })
    expect(mapSearchItemToItem(tv({ name: null, original_name: null }), context)).toBeNull()
  })

  it('extracts a release year only from a valid YYYY-MM-DD date within range', () => {
    expect(mapSearchItemToItem(movie({ release_date: '1888-01-01' }), context)?.releaseYear).toBe(1888)
    expect(mapSearchItemToItem(movie({ release_date: '2100-12-31' }), context)?.releaseYear).toBe(2100)
    for (const release_date of [undefined, '', '99-01-01', '1800-01-01', '2101-01-01', 'not-a-date']) {
      expect(mapSearchItemToItem(movie({ release_date }), context)?.releaseYear).toBeUndefined()
    }
  })

  it('builds a rating only for a finite 0..10 average with positive votes', () => {
    expect(mapSearchItemToItem(movie({ vote_average: 10, vote_count: 1 }), context)?.rating).toEqual({
      value: 10,
      voteCount: 1,
      scale: 10,
    })
    for (const [vote_average, vote_count] of [
      [8.4, 0],
      [11, 100],
      [-1, 100],
      [undefined, 100],
      [8.4, undefined],
    ] as const) {
      expect(
        mapSearchItemToItem(movie({ vote_average, vote_count }), context)?.rating
      ).toBeUndefined()
    }
    expect(mapSearchItemToItem(movie({ vote_average: 7.25, vote_count: 3 }), context)?.rating).toEqual({
      value: 7.3,
      voteCount: 3,
      scale: 10,
    })
  })

  it('resolves genre ids with the item media-type map and omits unknown ids', () => {
    expect(mapSearchItemToItem(tv({ genre_ids: [10765, 9999] }), context)?.genres).toEqual([
      { id: '10765', name: 'Sci-Fi & Fantasy' },
    ])
    expect(mapSearchItemToItem(movie({ genre_ids: undefined }), context)?.genres).toEqual([])
  })

  it('omits the poster when the provider path is missing', () => {
    expect(mapSearchItemToItem(movie({ poster_path: null }), context)?.poster).toBeUndefined()
  })

  it('removes duplicate opaque ids within one page, keeping the first occurrence', () => {
    const items = mapSearchResultsToItems(
      [movie({ title: 'First' }), movie({ title: 'Second' }), tv()],
      context
    )

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.title)).toEqual(['First', 'Example Show'])
  })

  it('preserves input order after drops and maps an all-invalid page to empty', () => {
    const items = mapSearchResultsToItems(
      [movie({ adult: true }), movie({ media_type: 'person' }), tv()],
      context
    )
    expect(items.map((item) => item.mediaType)).toEqual(['tv'])

    expect(
      mapSearchResultsToItems([movie({ adult: true }), movie({ id: 0 })], context)
    ).toEqual([])
  })
})
