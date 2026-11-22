import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'

import { resolveDetailReturn } from './detailReturn'

const fallback = { path: '/browse/movies', isCategory: false, isSearch: false }

describe('detail return-origin validation', () => {
  it('accepts a matching media landing', () => {
    expect(resolveDetailReturn('movie', { from: '/browse/movies' })).toEqual({
      path: '/browse/movies',
      isCategory: false,
      isSearch: false,
    })
  })

  it('accepts a matching media category', () => {
    expect(resolveDetailReturn('tv', { from: '/browse/tv-shows/top-rated' })).toEqual({
      path: '/browse/tv-shows/top-rated',
      isCategory: true,
      isSearch: false,
    })
  })

  it('accepts an internal search origin whose q is present', () => {
    expect(resolveDetailReturn('movie', { from: '/search?q=the%20matrix' })).toEqual({
      path: '/search?q=the%20matrix',
      isCategory: false,
      isSearch: true,
    })
    expect(resolveDetailReturn('tv', { from: '/search?extra=1&q=' })).toEqual({
      path: '/search?extra=1&q=',
      isCategory: false,
      isSearch: true,
    })
  })

  it('rejects mismatched types, detail origins, malformed search origins, and external URLs', () => {
    for (const state of [
      { from: '/browse/tv-shows' },
      { from: `/browse/movies/title/${MOVIE_ID}` },
      { from: 'https://evil.example/browse/movies' },
      { from: '//evil.example/search?q=x' },
      { from: '/search' },
      { from: '/search?extra=1' },
      { from: 'https://evil.example/search?q=x' },
      { from: '/other?q=x' },
      { from: 42 },
      null,
      'not-an-object',
    ]) {
      expect(resolveDetailReturn('movie', state)).toEqual(fallback)
    }
  })

  it('always returns a working in-app link', () => {
    const target = resolveDetailReturn('tv', undefined)
    expect(target.path.startsWith('/browse/tv-shows')).toBe(true)
    expect(target.isSearch).toBe(false)
  })
})
