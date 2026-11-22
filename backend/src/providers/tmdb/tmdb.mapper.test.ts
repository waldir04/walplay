import { describe, expect, it } from 'vitest'

import { decodeItemId } from '../../lib/itemId.js'
import {
  buildRating,
  extractReleaseYear,
  mapDetailToItem,
  mapListItemToItem,
  resolveTitle,
} from './tmdb.mapper.js'

const genreNames = new Map<number, string>([
  [18, 'Drama'],
  [35, 'Comedy'],
])

const poster = (path: string | null | undefined) =>
  path ? { url: `https://image.example.test/w342${path}` } : undefined

describe('title resolution', () => {
  it('prefers a usable localized title and adds a differing original title', () => {
    expect(resolveTitle('El club de la lucha', 'Fight Club')).toEqual({
      title: 'El club de la lucha',
      originalTitle: 'Fight Club',
    })
  })

  it('falls back to the original title when the localized title is empty', () => {
    expect(resolveTitle('   ', 'Fight Club')).toEqual({ title: 'Fight Club' })
    expect(resolveTitle(null, 'Fight Club')).toEqual({ title: 'Fight Club' })
  })

  it('drops items without any usable title', () => {
    expect(resolveTitle('', null)).toBeNull()
    expect(resolveTitle(undefined, '   ')).toBeNull()
  })

  it('omits originalTitle when identical to the title', () => {
    expect(resolveTitle('Fight Club', 'Fight Club')).toEqual({ title: 'Fight Club' })
  })
})

describe('year extraction', () => {
  it('extracts the four-digit year from a valid date', () => {
    expect(extractReleaseYear('1999-10-15')).toBe(1999)
    expect(extractReleaseYear('2024-01-01')).toBe(2024)
  })

  it('omits empty, malformed, and unusable dates', () => {
    expect(extractReleaseYear('')).toBeUndefined()
    expect(extractReleaseYear(null)).toBeUndefined()
    expect(extractReleaseYear('1999')).toBeUndefined()
    expect(extractReleaseYear('15/10/1999')).toBeUndefined()
    expect(extractReleaseYear('1200-01-01')).toBeUndefined()
    expect(extractReleaseYear('9999-01-01')).toBeUndefined()
  })
})

describe('rating rules', () => {
  it('keeps a finite 0..10 average with votes', () => {
    expect(buildRating(8.44, 100)).toEqual({ value: 8.4, voteCount: 100, scale: 10 })
    expect(buildRating(0, 5)).toEqual({ value: 0, voteCount: 5, scale: 10 })
    expect(buildRating(10, 5)).toEqual({ value: 10, voteCount: 5, scale: 10 })
  })

  it('omits ratings for zero votes, missing values, and out-of-range averages', () => {
    expect(buildRating(8.4, 0)).toBeUndefined()
    expect(buildRating(8.4, null)).toBeUndefined()
    expect(buildRating(null, 10)).toBeUndefined()
    expect(buildRating(-0.1, 10)).toBeUndefined()
    expect(buildRating(10.1, 10)).toBeUndefined()
    expect(buildRating(Number.NaN, 10)).toBeUndefined()
    expect(buildRating(8.4, 1.5)).toBeUndefined()
  })
})

describe('list mapping', () => {
  const base = {
    id: 550,
    title: 'Fight Club',
    original_title: 'Fight Club',
    release_date: '1999-10-15',
    poster_path: '/fight-club.jpg',
    adult: false,
    vote_average: 8.4,
    vote_count: 100,
    genre_ids: [18, 999],
  }

  it('maps a movie to the provider-neutral item with an opaque id', () => {
    const item = mapListItemToItem(base, { mediaType: 'movie', genreNames, poster })

    expect(item).not.toBeNull()
    if (!item) {
      return
    }
    expect(item.mediaType).toBe('movie')
    expect(item.title).toBe('Fight Club')
    expect(decodeItemId(item.id)).toEqual({ provider: 'tmdb', mediaType: 'movie', providerId: 550 })
    expect(item.releaseYear).toBe(1999)
    expect(item.rating).toEqual({ value: 8.4, voteCount: 100, scale: 10 })
    expect(item.genres).toEqual([{ id: '18', name: 'Drama' }])
    expect(item.poster?.url).toContain('/w342/fight-club.jpg')
  })

  it('drops adult, identity-less, and untitled items', () => {
    expect(mapListItemToItem({ ...base, adult: true }, { mediaType: 'movie' })).toBeNull()
    expect(mapListItemToItem({ ...base, id: 0 }, { mediaType: 'movie' })).toBeNull()
    expect(
      mapListItemToItem({ ...base, title: null, original_title: null }, { mediaType: 'movie' })
    ).toBeNull()
  })

  it('omits genres when no resolution map is available and unknown ids', () => {
    expect(mapListItemToItem(base, { mediaType: 'movie' })?.genres).toEqual([])
  })

  it('maps TV items with name fields and first-air year', () => {
    const item = mapListItemToItem(
      {
        id: 1399,
        name: 'Serie',
        original_name: 'Show',
        first_air_date: '2011-04-17',
        poster_path: null,
        vote_average: 9,
        vote_count: 100,
        genre_ids: [18],
      },
      { mediaType: 'tv', genreNames, poster }
    )

    expect(item?.title).toBe('Serie')
    expect(item?.originalTitle).toBe('Show')
    expect(item?.releaseYear).toBe(2011)
    expect(item?.poster).toBeUndefined()
  })

  it('keeps zero as a real rating only when votes exist', () => {
    expect(
      mapListItemToItem({ ...base, vote_average: 0, vote_count: 2 }, { mediaType: 'movie' })?.rating
    ).toEqual({
      value: 0,
      voteCount: 2,
      scale: 10,
    })
  })
})

describe('detail mapping', () => {
  it('maps localized detail genres and poster', () => {
    const item = mapDetailToItem(
      {
        id: 550,
        title: 'El club de la lucha',
        original_title: 'Fight Club',
        release_date: '1999-10-15',
        poster_path: '/fight-club.jpg',
        vote_average: 8.4,
        vote_count: 100,
        genres: [
          { id: 18, name: 'Drama' },
          { id: 99, name: '  ' },
        ],
      },
      { mediaType: 'movie', poster }
    )

    expect(item?.title).toBe('El club de la lucha')
    expect(item?.originalTitle).toBe('Fight Club')
    expect(item?.genres).toEqual([{ id: '18', name: 'Drama' }])
    expect(item?.poster?.url).toContain('/w342/')
  })

  it('rejects detail items without identity, title, or with adult flags', () => {
    expect(mapDetailToItem({ id: 0, title: 'x' }, { mediaType: 'movie' })).toBeNull()
    expect(mapDetailToItem({ id: 1, title: null }, { mediaType: 'movie' })).toBeNull()
    expect(mapDetailToItem({ id: 1, title: 'x', adult: true }, { mediaType: 'movie' })).toBeNull()
  })
})
