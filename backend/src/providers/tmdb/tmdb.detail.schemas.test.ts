import { describe, expect, it } from 'vitest'

import {
  aggregateCreditsDto,
  collectionDto,
  creditsDto,
  movieDetailDto,
  seasonDto,
  similarDto,
  tvDetailDto,
} from './tmdb.detail.schemas.js'
import {
  completeCollection,
  completeMovieDetail,
  completeSeason,
  completeSimilar,
  completeTvDetail,
  malformedMovieDetail,
  movieCredits,
  tvAggregateCredits,
} from '../../test/fixtures/tmdb/detail.js'

describe('tmdb detail schemas', () => {
  it('accepts complete provider payloads and ignores unknown keys', () => {
    expect(movieDetailDto.parse({ ...completeMovieDetail(), unexpected: true }).id).toBe(550)
    expect(tvDetailDto.parse(completeTvDetail()).id).toBe(213)
    expect(creditsDto.parse(movieCredits()).cast).toHaveLength(3)
    expect(aggregateCreditsDto.parse(tvAggregateCredits()).crew).toHaveLength(2)
    expect(similarDto.parse(completeSimilar()).results.length).toBeGreaterThan(0)
    expect(collectionDto.parse(completeCollection()).parts).toHaveLength(2)
    expect(seasonDto.parse(completeSeason()).episodes).toHaveLength(3)
  })

  it('accepts payloads with optional fields missing', () => {
    const movie = movieDetailDto.parse({ id: 1, title: 'Only title' })
    expect(movie.genres).toBeUndefined()
    expect(movie.videos).toBeUndefined()

    const tv = tvDetailDto.parse({ id: 2, name: 'Only name' })
    expect(tv.seasons).toBeUndefined()
    expect(tv.networks).toBeUndefined()

    const credits = creditsDto.parse({})
    expect(credits.cast).toBeUndefined()
    expect(credits.crew).toBeUndefined()
  })

  it('rejects payloads that fail the consumed field types', () => {
    expect(movieDetailDto.safeParse(malformedMovieDetail()).success).toBe(false)
    expect(tvDetailDto.safeParse({ id: 2, seasons: 'nope' }).success).toBe(false)
    expect(creditsDto.safeParse({ cast: [{ name: 1 }] }).success).toBe(false)
    expect(seasonDto.safeParse({ episodes: [{ episode_number: 'one' }] }).success).toBe(false)
  })
})
