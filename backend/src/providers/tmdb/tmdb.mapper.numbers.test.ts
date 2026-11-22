import { describe, expect, it } from 'vitest'

import {
  movieWithoutDate,
  movieWithMalformedDate,
  movieWithOutOfRangeRating,
  movieWithZeroVotes,
} from '../../test/fixtures/tmdb/incomplete.js'
import { movieListItem } from '../../test/fixtures/tmdb/listPages.js'
import { buildRating, extractReleaseYear, mapListItemToItem } from './tmdb.mapper.js'

describe('year and rating rules', () => {
  it('extracts a four-digit year only from valid dates', () => {
    expect(extractReleaseYear('1999-10-15')).toBe(1999)
    expect(extractReleaseYear('')).toBeUndefined()
    expect(extractReleaseYear(null)).toBeUndefined()
    expect(extractReleaseYear('1999')).toBeUndefined()
    expect(extractReleaseYear('15/10/1999')).toBeUndefined()
  })

  it('omits an unusable year from the item', () => {
    expect(
      mapListItemToItem(movieWithoutDate(), { mediaType: 'movie' })?.releaseYear
    ).toBeUndefined()
    expect(
      mapListItemToItem(movieWithMalformedDate(), { mediaType: 'movie' })?.releaseYear
    ).toBeUndefined()
  })

  it('keeps ratings only for finite 0..10 averages with votes', () => {
    expect(buildRating(8.44, 100)).toEqual({ value: 8.4, voteCount: 100, scale: 10 })
    expect(buildRating(0, 3)).toEqual({ value: 0, voteCount: 3, scale: 10 })
    expect(buildRating(8, 0)).toBeUndefined()
    expect(buildRating(11, 10)).toBeUndefined()
    expect(buildRating(Number.NaN, 10)).toBeUndefined()
  })

  it('omits zero-vote and out-of-range ratings from items', () => {
    expect(mapListItemToItem(movieWithZeroVotes(), { mediaType: 'movie' })?.rating).toBeUndefined()
    expect(
      mapListItemToItem(movieWithOutOfRangeRating(), { mediaType: 'movie' })?.rating
    ).toBeUndefined()
  })

  it('never treats zero as missing when votes exist', () => {
    expect(
      mapListItemToItem(movieListItem({ vote_average: 0, vote_count: 2 }), { mediaType: 'movie' })
        ?.rating
    ).toEqual({ value: 0, voteCount: 2, scale: 10 })
  })
})
