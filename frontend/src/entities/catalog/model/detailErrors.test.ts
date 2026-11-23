import { describe, expect, it } from 'vitest'

import {
  DETAIL_PAGE_COPY_KEYS,
  DETAIL_SECTION_COPY_KEYS,
  detailPageCopyKeys,
  detailStateForError,
  detailStateForErrorCode,
} from './detailErrors'
import { CatalogApiError } from '@/shared/api/httpClient'

describe('detail error mapping', () => {
  it('maps a missing title to not-found', () => {
    expect(detailStateForErrorCode('CATALOG_NOT_FOUND')).toBe('not-found')
  })

  it('maps a missing season to a fallback signal rather than a page error', () => {
    expect(detailStateForErrorCode('DETAIL_SEASON_NOT_FOUND')).toBe('season-fallback')
  })

  it('maps other failures to a recoverable error', () => {
    for (const code of [
      'VALIDATION_ERROR',
      'CATALOG_RATE_LIMITED',
      'CATALOG_TIMEOUT',
      'CATALOG_UNAVAILABLE',
      'CATALOG_INVALID_RESPONSE',
      'INTERNAL_ERROR',
      'ROUTE_NOT_FOUND',
    ] as const) {
      expect(detailStateForErrorCode(code)).toBe('error')
    }
  })

  it('reads the code from a typed error and defaults to error', () => {
    expect(detailStateForError(new CatalogApiError('CATALOG_NOT_FOUND', 404))).toBe('not-found')
    expect(detailStateForError(new Error('boom'))).toBe('error')
    expect(detailStateForError(null)).toBe('error')
  })

  it('keeps page and section copy distinct', () => {
    expect(detailPageCopyKeys('not-found').title).toBe('detail.states.notFound.title')
    expect(detailPageCopyKeys('error').title).toBe('detail.states.error.title')
    expect(DETAIL_PAGE_COPY_KEYS['not-found'].description).toBe(
      'detail.states.notFound.description'
    )
    expect(DETAIL_SECTION_COPY_KEYS.error.description).toBe(
      'detail.states.sectionError.description'
    )
    expect(new Set(Object.values(DETAIL_PAGE_COPY_KEYS).map((copy) => copy.title)).size).toBe(2)
  })
})
