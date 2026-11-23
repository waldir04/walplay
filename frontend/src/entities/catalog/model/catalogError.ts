import type { CatalogErrorCode } from '@/shared/api/httpClient'

export type CatalogUiState = 'unavailable' | 'rate-limited' | 'timed-out' | 'not-found' | 'empty'

export interface CatalogStateCopyKeys {
  readonly title: string
  readonly description: string
}

const UNAVAILABLE: CatalogStateCopyKeys = Object.freeze({
  title: 'catalog.states.unavailable.title',
  description: 'catalog.states.unavailable.description',
})

const EMPTY: CatalogStateCopyKeys = Object.freeze({
  title: 'catalog.states.empty.title',
  description: 'catalog.states.empty.description',
})

export const STATE_COPY_KEYS: Readonly<Record<CatalogUiState, CatalogStateCopyKeys>> =
  Object.freeze({
    unavailable: UNAVAILABLE,
    'rate-limited': Object.freeze({
      title: 'catalog.states.rateLimited.title',
      description: 'catalog.states.rateLimited.description',
    }),
    'timed-out': Object.freeze({
      title: 'catalog.states.timedOut.title',
      description: 'catalog.states.timedOut.description',
    }),
    'not-found': Object.freeze({
      title: 'catalog.states.notFound.title',
      description: 'catalog.states.notFound.description',
    }),
    empty: EMPTY,
  })

export const ERROR_CODE_TO_STATE: Readonly<Record<CatalogErrorCode, CatalogUiState>> =
  Object.freeze({
    VALIDATION_ERROR: 'unavailable',
    CATALOG_NOT_FOUND: 'not-found',
    DETAIL_SEASON_NOT_FOUND: 'unavailable',
    CATALOG_RATE_LIMITED: 'rate-limited',
    CATALOG_TIMEOUT: 'timed-out',
    CATALOG_UNAVAILABLE: 'unavailable',
    CATALOG_INVALID_RESPONSE: 'unavailable',
    INTERNAL_ERROR: 'unavailable',
    ROUTE_NOT_FOUND: 'not-found',
  })

export const stateForErrorCode = (code: CatalogErrorCode): CatalogUiState =>
  ERROR_CODE_TO_STATE[code]

export const stateCopyKeys = (state: CatalogUiState): CatalogStateCopyKeys => STATE_COPY_KEYS[state]

export const stateForError = (error: unknown): CatalogUiState => {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { readonly code?: unknown }).code
    if (typeof code === 'string' && code in ERROR_CODE_TO_STATE) {
      return ERROR_CODE_TO_STATE[code as CatalogErrorCode]
    }
  }
  return 'unavailable'
}
