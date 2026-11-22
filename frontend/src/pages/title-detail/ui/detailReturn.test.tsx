import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'

import { resolveDetailReturn } from './detailReturn'

describe('detail return-origin validation', () => {
  it('accepts a matching media landing', () => {
    expect(resolveDetailReturn('movie', { from: '/browse/movies' })).toEqual({
      path: '/browse/movies',
      isCategory: false,
    })
  })

  it('accepts a matching media category', () => {
    expect(resolveDetailReturn('tv', { from: '/browse/tv-shows/top-rated' })).toEqual({
      path: '/browse/tv-shows/top-rated',
      isCategory: true,
    })
  })

  it('rejects mismatched types, detail origins, and external URLs', () => {
    for (const state of [
      { from: '/browse/tv-shows' },
      { from: `/browse/movies/title/${MOVIE_ID}` },
      { from: 'https://evil.example/browse/movies' },
      { from: 42 },
      null,
      'not-an-object',
    ]) {
      expect(resolveDetailReturn('movie', state)).toEqual({
        path: '/browse/movies',
        isCategory: false,
      })
    }
  })

  it('always returns a working in-app link', () => {
    const target = resolveDetailReturn('tv', undefined)
    expect(target.path.startsWith('/browse/tv-shows')).toBe(true)
  })
})
