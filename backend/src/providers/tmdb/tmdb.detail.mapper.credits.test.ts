import { describe, expect, it } from 'vitest'

import {
  mapMovieCredits,
  mapTvCredits,
} from './tmdb.detail.mapper.js'
import {
  largeMovieCredits,
  movieCredits,
  tvAggregateCredits,
} from '../../test/fixtures/tmdb/detail.js'

const artwork = {
  profile: (path: string | null | undefined) =>
    typeof path === 'string' && path.trim() !== ''
      ? { url: `https://image.example.test/w185${path}` }
      : undefined,
}

describe('movie credits mapping', () => {
  it('preserves provider order and bounds the cast preview', () => {
    const credits = mapMovieCredits(movieCredits(), artwork)
    expect(credits.cast.map((credit) => credit.name)).toEqual([
      'Edward Norton',
      'Brad Pitt',
      'Helena Bonham Carter',
    ])
    expect(credits.cast[0]).toEqual({
      name: 'Edward Norton',
      character: 'The Narrator',
      profile: { url: 'https://image.example.test/w185/n.jpg' },
    })
    expect(credits.cast[2]).not.toHaveProperty('character')
  })

  it('maps only supported crew jobs and bounds the preview', () => {
    const credits = mapMovieCredits(movieCredits(), artwork)
    expect(credits.crew).toEqual([
      { name: 'David Fincher', role: 'director', profile: { url: 'https://image.example.test/w185/f.jpg' } },
      { name: 'Jim Uhls', role: 'writer' },
    ])
  })

  it('drops unnamed credits and deduplicates person plus role', () => {
    const credits = mapMovieCredits(
      {
        cast: [{ id: 1, name: '', character: 'Nobody' }, { id: 2, name: 'Real', character: null }],
        crew: [
          { id: 3, name: 'Same', job: 'Director' },
          { id: 3, name: 'Same', job: 'Director' },
          { id: 3, name: 'Same', job: 'Writer' },
        ],
      },
      artwork
    )
    expect(credits.cast).toEqual([{ name: 'Real' }])
    expect(credits.crew).toEqual([
      { name: 'Same', role: 'director' },
      { name: 'Same', role: 'writer' },
    ])
  })

  it('bounds a large provider list to ten cast and six crew', () => {
    const credits = mapMovieCredits(largeMovieCredits(), artwork)
    expect(credits.cast).toHaveLength(10)
    expect(credits.crew).toHaveLength(6)
    expect(credits.cast[0]?.name).toBe('Performer 1')
    expect(credits.cast[9]?.name).toBe('Performer 10')
  })

  it('never exposes internal ordering fields', () => {
    const credits = mapMovieCredits(movieCredits(), artwork)
    expect(JSON.stringify(credits)).not.toContain('billingOrder')
    expect(JSON.stringify(credits)).not.toContain('department')
  })
})

describe('tv aggregate credits mapping', () => {
  it('uses the first usable role character', () => {
    const credits = mapTvCredits(tvAggregateCredits(), artwork)
    expect(credits.cast[0]).toEqual({
      name: 'Louis Hofmann',
      character: 'Jonas Kahnwald',
      profile: { url: 'https://image.example.test/w185/lh.jpg' },
    })
    expect(credits.cast[1]).not.toHaveProperty('character')
  })

  it('maps jobs per member with person-plus-role deduplication', () => {
    const credits = mapTvCredits(tvAggregateCredits(), artwork)
    expect(credits.crew).toEqual([
      {
        name: 'Baran bo Odar',
        role: 'director',
        profile: { url: 'https://image.example.test/w185/b.jpg' },
      },
      { name: 'Baran bo Odar', role: 'writer', profile: { url: 'https://image.example.test/w185/b.jpg' } },
      { name: 'Jantje Friese', role: 'creator' },
    ])
  })
})
