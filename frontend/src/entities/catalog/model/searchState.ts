import type { CatalogErrorCode } from '@/shared/api/httpClient'

export type SearchUiState = 'unavailable' | 'rate-limited' | 'timed-out' | 'query-invalid'

export interface SearchStateCopyKeys {
  readonly title: string
  readonly description: string
}

export const SEARCH_STATE_COPY_KEYS: Readonly<Record<SearchUiState, SearchStateCopyKeys>> =
  Object.freeze({
    unavailable: Object.freeze({
      title: 'search.states.unavailable.title',
      description: 'search.states.unavailable.description',
    }),
    'rate-limited': Object.freeze({
      title: 'search.states.rateLimited.title',
      description: 'search.states.rateLimited.description',
    }),
    'timed-out': Object.freeze({
      title: 'search.states.timedOut.title',
      description: 'search.states.timedOut.description',
    }),
    'query-invalid': Object.freeze({
      title: 'search.guidance.queryInvalid.title',
      description: 'search.guidance.queryInvalid.description',
    }),
  })

export const SEARCH_ERROR_CODE_TO_STATE: Readonly<Record<CatalogErrorCode, SearchUiState>> =
  Object.freeze({
    VALIDATION_ERROR: 'query-invalid',
    CATALOG_NOT_FOUND: 'unavailable',
    DETAIL_SEASON_NOT_FOUND: 'unavailable',
    CATALOG_RATE_LIMITED: 'rate-limited',
    CATALOG_TIMEOUT: 'timed-out',
    CATALOG_UNAVAILABLE: 'unavailable',
    CATALOG_INVALID_RESPONSE: 'unavailable',
    INTERNAL_ERROR: 'unavailable',
    ROUTE_NOT_FOUND: 'unavailable',
  })

export const searchStateForErrorCode = (code: CatalogErrorCode): SearchUiState =>
  SEARCH_ERROR_CODE_TO_STATE[code]

export const searchStateCopyKeys = (state: SearchUiState): SearchStateCopyKeys =>
  SEARCH_STATE_COPY_KEYS[state]

export const searchStateForError = (error: unknown): SearchUiState => {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { readonly code?: unknown }).code
    if (typeof code === 'string' && code in SEARCH_ERROR_CODE_TO_STATE) {
      return SEARCH_ERROR_CODE_TO_STATE[code as CatalogErrorCode]
    }
  }
  return 'unavailable'
}

export const SEARCH_COPY_KEYS = Object.freeze({
  initial: Object.freeze({
    title: 'search.guidance.initial.title',
    description: 'search.guidance.initial.description',
  }),
  tooShort: 'search.guidance.tooShort',
  tooLong: 'search.guidance.tooLong',
  loadingLabel: 'search.results.loadingLabel',
  noResults: Object.freeze({
    title: 'search.states.noResults.title',
    description: 'search.states.noResults.description',
  }),
  stale: 'search.states.stale.lastUpdated',
  interimEmpty: 'search.states.interimEmpty',
  endOfResults: 'search.states.endOfResults',
  pageError: Object.freeze({
    title: 'search.states.pageError.title',
    description: 'search.states.pageError.description',
  }),
} as const)
