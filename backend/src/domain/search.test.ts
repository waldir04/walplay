import { describe, expect, it } from 'vitest'

import {
  SEARCH_QUERY_MAX_CODE_POINTS,
  SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS,
  SEARCH_MAX_REQUEST_PAGE,
  buildSearchCacheKey,
  buildSearchQuery,
  classifySearchQuery,
  countCodePoints,
  countNonWhitespaceCharacters,
  isValidSearchQuery,
  normalizeSearchQuery,
} from './search.js'

describe('search query identity', () => {
  it('exposes the named business constants', () => {
    expect(SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS).toBe(2)
    expect(SEARCH_QUERY_MAX_CODE_POINTS).toBe(200)
    expect(SEARCH_MAX_REQUEST_PAGE).toBe(1000)
  })

  it('trims the raw query while preserving internal whitespace for the provider', () => {
    const query = buildSearchQuery('   The   Matrix   ')

    expect(query.raw).toBe('   The   Matrix   ')
    expect(query.trimmed).toBe('The   Matrix')
  })

  it('normalizes identity by collapsing whitespace and folding case', () => {
    expect(normalizeSearchQuery('  THE   Matrix\tReloaded ')).toBe('the matrix reloaded')
    expect(buildSearchQuery('  THE   Matrix ').identity).toBe('the matrix')
  })

  it('counts non-whitespace characters and code points', () => {
    expect(countNonWhitespaceCharacters(' a b ')).toBe(2)
    expect(countNonWhitespaceCharacters('   ')).toBe(0)
    expect(countCodePoints('😀a')).toBe(2)
    expect(countCodePoints('abc')).toBe(3)
  })

  it('classifies empty, too-short, too-long, and valid queries', () => {
    expect(classifySearchQuery('')).toBe('empty')
    expect(classifySearchQuery('   ')).toBe('empty')
    expect(classifySearchQuery('a')).toBe('too-short')
    expect(classifySearchQuery(' a ')).toBe('too-short')
    expect(classifySearchQuery('ab')).toBe('valid')
    expect(classifySearchQuery('😀😀')).toBe('valid')
    expect(classifySearchQuery('😀'.repeat(SEARCH_QUERY_MAX_CODE_POINTS))).toBe('valid')
    expect(classifySearchQuery('😀'.repeat(SEARCH_QUERY_MAX_CODE_POINTS + 1))).toBe('too-long')
  })

  it('builds a complete query model and reports validity', () => {
    const query = buildSearchQuery('  😀b  ')

    expect(query).toEqual({
      raw: '  😀b  ',
      trimmed: '😀b',
      identity: '😀b',
      nonWhitespaceLength: 2,
      length: 2,
      validity: 'valid',
    })
    expect(isValidSearchQuery(query)).toBe(true)
    expect(isValidSearchQuery(buildSearchQuery('a'))).toBe(false)
  })

  it('isolates every cache-key component', () => {
    const base = {
      provider: 'tmdb' as const,
      identity: 'the matrix',
      language: 'en-US' as const,
      page: 1,
    }
    const key = buildSearchCacheKey(base)

    expect(key).toBe('tmdb:search:the matrix:en-US:1')
    expect(buildSearchCacheKey({ ...base, language: 'es-ES' })).not.toBe(key)
    expect(buildSearchCacheKey({ ...base, page: 2 })).not.toBe(key)
    expect(buildSearchCacheKey({ ...base, identity: 'arrival' })).not.toBe(key)
    expect(buildSearchCacheKey({ ...base, provider: 'other' as 'tmdb' })).not.toBe(key)
  })
})
