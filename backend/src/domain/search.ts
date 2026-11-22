import type { CatalogItem, ProviderLanguage } from './catalog.js'

export const SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS = 2
export const SEARCH_QUERY_MAX_CODE_POINTS = 200
export const SEARCH_MAX_REQUEST_PAGE = 1000

export interface ProviderSearchPage {
  readonly page: number
  readonly items: readonly CatalogItem[]
  readonly totalPages?: number
}

export interface SearchPageRequest {
  readonly query: string
  readonly language: ProviderLanguage
  readonly page: number
}

export type SearchQueryValidity = 'empty' | 'too-short' | 'too-long' | 'valid'

export interface SearchQuery {
  readonly raw: string
  readonly trimmed: string
  readonly identity: string
  readonly nonWhitespaceLength: number
  readonly length: number
  readonly validity: SearchQueryValidity
}

export const countCodePoints = (value: string): number => Array.from(value).length

export const countNonWhitespaceCharacters = (value: string): number =>
  Array.from(value).filter((character) => !/\s/u.test(character)).length

export const normalizeSearchQuery = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLowerCase()

export const classifySearchQuery = (trimmed: string): SearchQueryValidity => {
  const value = trimmed.trim()
  if (value.length === 0) {
    return 'empty'
  }

  if (countNonWhitespaceCharacters(value) < SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS) {
    return 'too-short'
  }

  if (countCodePoints(value) > SEARCH_QUERY_MAX_CODE_POINTS) {
    return 'too-long'
  }

  return 'valid'
}

export const buildSearchQuery = (raw: string): SearchQuery => {
  const trimmed = raw.trim()
  return {
    raw,
    trimmed,
    identity: normalizeSearchQuery(raw),
    nonWhitespaceLength: countNonWhitespaceCharacters(trimmed),
    length: countCodePoints(trimmed),
    validity: classifySearchQuery(trimmed),
  }
}

export const isValidSearchQuery = (query: SearchQuery): boolean => query.validity === 'valid'

export interface SearchCacheKeyInput {
  readonly provider: 'tmdb'
  readonly identity: string
  readonly language: ProviderLanguage
  readonly page: number
}

export const buildSearchCacheKey = ({
  provider,
  identity,
  language,
  page,
}: SearchCacheKeyInput): string => [provider, 'search', identity, language, String(page)].join(':')
