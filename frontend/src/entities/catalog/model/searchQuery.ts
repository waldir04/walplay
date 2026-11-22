import { z } from 'zod'

import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/shared/config/constants'

export type SearchQueryValidity = 'empty' | 'too-short' | 'too-long' | 'valid'

export interface SearchQuery {
  readonly raw: string
  readonly trimmed: string
  readonly identity: string
  readonly nonWhitespaceLength: number
  readonly length: number
  readonly validity: SearchQueryValidity
}

export const countSearchQueryCodePoints = (value: string): number => Array.from(value).length

export const countSearchQueryNonWhitespace = (value: string): number =>
  Array.from(value).filter((character) => !/\s/u.test(character)).length

export const normalizeSearchIdentity = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLowerCase()

export const classifySearchQuery = (raw: string): SearchQueryValidity => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return 'empty'
  }
  if (countSearchQueryNonWhitespace(trimmed) < SEARCH_MIN_QUERY_LENGTH) {
    return 'too-short'
  }
  if (countSearchQueryCodePoints(trimmed) > SEARCH_MAX_QUERY_LENGTH) {
    return 'too-long'
  }
  return 'valid'
}

export const searchQueryTextSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: 'search-query-empty' })
  .refine((value) => countSearchQueryNonWhitespace(value) >= SEARCH_MIN_QUERY_LENGTH, {
    message: 'search-query-too-short',
  })
  .refine((value) => countSearchQueryCodePoints(value) <= SEARCH_MAX_QUERY_LENGTH, {
    message: 'search-query-too-long',
  })

export const isValidSearchQueryText = (value: string): boolean =>
  searchQueryTextSchema.safeParse(value).success

export const buildSearchQuery = (raw: string): SearchQuery => {
  const trimmed = raw.trim()
  return {
    raw,
    trimmed,
    identity: normalizeSearchIdentity(raw),
    nonWhitespaceLength: countSearchQueryNonWhitespace(trimmed),
    length: countSearchQueryCodePoints(trimmed),
    validity: classifySearchQuery(trimmed),
  }
}

export const hasSearchQueryParameter = (search: string): boolean =>
  new URLSearchParams(search).has('q')

export const parseSearchQueryAddress = (search: string): SearchQuery => {
  const params = new URLSearchParams(search)
  return buildSearchQuery(params.get('q') ?? '')
}

export const searchOriginPath = (query: SearchQuery): string =>
  `/search?q=${encodeURIComponent(query.trimmed)}`
