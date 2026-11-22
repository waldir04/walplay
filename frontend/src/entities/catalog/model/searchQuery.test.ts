import { describe, expect, it } from 'vitest'

import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/shared/config/constants'

import {
  buildSearchQuery,
  classifySearchQuery,
  countSearchQueryCodePoints,
  countSearchQueryNonWhitespace,
  hasSearchQueryParameter,
  isValidSearchQueryText,
  normalizeSearchIdentity,
  parseSearchQueryAddress,
  searchOriginPath,
  searchQueryTextSchema,
} from './searchQuery'

describe('search query model', () => {
  it('trims, preserves internal whitespace, and folds identity', () => {
    const query = buildSearchQuery('   The   Matrix   ')

    expect(query.raw).toBe('   The   Matrix   ')
    expect(query.trimmed).toBe('The   Matrix')
    expect(query.identity).toBe('the matrix')
    expect(normalizeSearchIdentity('  THE\tMatrix ')).toBe('the matrix')
  })

  it('counts Unicode code points and non-whitespace characters', () => {
    expect(countSearchQueryCodePoints('😀a')).toBe(2)
    expect(countSearchQueryNonWhitespace(' 😀 a ')).toBe(2)
    expect(countSearchQueryNonWhitespace('   ')).toBe(0)
  })

  it('classifies each validity state with the named limits', () => {
    expect(classifySearchQuery('')).toBe('empty')
    expect(classifySearchQuery('   ')).toBe('empty')
    expect(classifySearchQuery('a')).toBe('too-short')
    expect(classifySearchQuery(' a ')).toBe('too-short')
    expect(classifySearchQuery('ab')).toBe('valid')
    expect(classifySearchQuery('😀'.repeat(SEARCH_MAX_QUERY_LENGTH))).toBe('valid')
    expect(classifySearchQuery('😀'.repeat(SEARCH_MAX_QUERY_LENGTH + 1))).toBe('too-long')
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(2)
  })

  it('builds a discriminated validity model', () => {
    expect(buildSearchQuery('  Ab  ')).toEqual({
      raw: '  Ab  ',
      trimmed: 'Ab',
      identity: 'ab',
      nonWhitespaceLength: 2,
      length: 2,
      validity: 'valid',
    })
    expect(buildSearchQuery('a').validity).toBe('too-short')
  })

  it('shares one Zod validity schema between form and address parsing', () => {
    expect(searchQueryTextSchema.parse('  matrix  ')).toBe('matrix')
    expect(searchQueryTextSchema.safeParse('').success).toBe(false)
    expect(searchQueryTextSchema.safeParse('   ').success).toBe(false)
    expect(searchQueryTextSchema.safeParse('a').success).toBe(false)
    expect(searchQueryTextSchema.safeParse('😀'.repeat(201)).success).toBe(false)
    expect(searchQueryTextSchema.safeParse('😀'.repeat(200)).success).toBe(true)
    expect(isValidSearchQueryText('matrix')).toBe(true)
    expect(isValidSearchQueryText('a')).toBe(false)
  })

  it('parses the address with first occurrence wins and + as space', () => {
    expect(parseSearchQueryAddress('?q=the+matrix').trimmed).toBe('the matrix')
    expect(parseSearchQueryAddress('?q=a&q=b').trimmed).toBe('a')
    expect(parseSearchQueryAddress('?extra=1&q=the+matrix&page=2').trimmed).toBe('the matrix')
    expect(parseSearchQueryAddress('?q=').validity).toBe('empty')
    expect(parseSearchQueryAddress('').validity).toBe('empty')
  })

  it('distinguishes an absent q parameter from an empty one', () => {
    expect(hasSearchQueryParameter('')).toBe(false)
    expect(hasSearchQueryParameter('?extra=1')).toBe(false)
    expect(hasSearchQueryParameter('?q=')).toBe(true)
    expect(hasSearchQueryParameter('?q=matrix')).toBe(true)
  })

  it('builds an encoded origin path from the active query only', () => {
    expect(searchOriginPath(buildSearchQuery('  the matrix  '))).toBe('/search?q=the%20matrix')
    expect(searchOriginPath(buildSearchQuery('a+b&c'))).toBe('/search?q=a%2Bb%26c')
    expect(searchOriginPath(buildSearchQuery('Ação'))).toBe('/search?q=A%C3%A7%C3%A3o')
  })
})
