import type { CatalogErrorCode } from '@/shared/api/httpClient'

export type DetailUiState = 'not-found' | 'season-fallback' | 'error'

export interface DetailCopyKeys {
  readonly title: string
  readonly description: string
}

export const DETAIL_PAGE_COPY_KEYS: Readonly<Record<'not-found' | 'error', DetailCopyKeys>> =
  Object.freeze({
    'not-found': Object.freeze({
      title: 'detail.states.notFound.title',
      description: 'detail.states.notFound.description',
    }),
    error: Object.freeze({
      title: 'detail.states.error.title',
      description: 'detail.states.error.description',
    }),
  })

export const DETAIL_SECTION_COPY_KEYS: Readonly<Record<'error', DetailCopyKeys>> = Object.freeze({
  error: Object.freeze({
    title: 'detail.states.sectionError.title',
    description: 'detail.states.sectionError.description',
  }),
})

export const detailStateForErrorCode = (code: CatalogErrorCode): DetailUiState => {
  if (code === 'CATALOG_NOT_FOUND') {
    return 'not-found'
  }
  if (code === 'DETAIL_SEASON_NOT_FOUND') {
    return 'season-fallback'
  }
  return 'error'
}

export const detailStateForError = (error: unknown): DetailUiState => {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { readonly code?: unknown }).code
    if (typeof code === 'string') {
      return detailStateForErrorCode(code as CatalogErrorCode)
    }
  }
  return 'error'
}

export const detailPageCopyKeys = (state: 'not-found' | 'error'): DetailCopyKeys =>
  DETAIL_PAGE_COPY_KEYS[state]
