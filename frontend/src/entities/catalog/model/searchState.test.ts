import { describe, expect, it } from 'vitest'

import {
  SEARCH_COPY_KEYS,
  SEARCH_STATE_COPY_KEYS,
  searchStateCopyKeys,
  searchStateForError,
  searchStateForErrorCode,
} from './searchState'

describe('search state mapping', () => {
  it('maps every error code to a search state', () => {
    expect(searchStateForErrorCode('CATALOG_UNAVAILABLE')).toBe('unavailable')
    expect(searchStateForErrorCode('CATALOG_RATE_LIMITED')).toBe('rate-limited')
    expect(searchStateForErrorCode('CATALOG_TIMEOUT')).toBe('timed-out')
    expect(searchStateForErrorCode('CATALOG_INVALID_RESPONSE')).toBe('unavailable')
    expect(searchStateForErrorCode('VALIDATION_ERROR')).toBe('query-invalid')
    expect(searchStateForErrorCode('INTERNAL_ERROR')).toBe('unavailable')
    expect(searchStateForErrorCode('CATALOG_NOT_FOUND')).toBe('unavailable')
    expect(searchStateForErrorCode('ROUTE_NOT_FOUND')).toBe('unavailable')
  })

  it('maps thrown errors by code and unknown errors to unavailable', () => {
    expect(searchStateForError({ code: 'CATALOG_TIMEOUT' })).toBe('timed-out')
    expect(searchStateForError({ code: 'VALIDATION_ERROR' })).toBe('query-invalid')
    expect(searchStateForError(new Error('boom'))).toBe('unavailable')
    expect(searchStateForError(null)).toBe('unavailable')
    expect(searchStateForError({ code: 'SOMETHING_ELSE' })).toBe('unavailable')
  })

  it('provides localized copy keys for every search state', () => {
    expect(searchStateCopyKeys('unavailable')).toEqual(SEARCH_STATE_COPY_KEYS.unavailable)
    expect(SEARCH_STATE_COPY_KEYS['rate-limited'].title).toBe('search.states.rateLimited.title')
    expect(SEARCH_STATE_COPY_KEYS['timed-out'].description).toBe(
      'search.states.timedOut.description'
    )
    expect(SEARCH_STATE_COPY_KEYS['query-invalid'].title).toBe('search.guidance.queryInvalid.title')
  })

  it('exposes copy keys for guidance, no-results, stale, interim-empty, end, and page-error', () => {
    expect(SEARCH_COPY_KEYS.initial).toEqual({
      title: 'search.guidance.initial.title',
      description: 'search.guidance.initial.description',
    })
    expect(SEARCH_COPY_KEYS.tooShort).toBe('search.guidance.tooShort')
    expect(SEARCH_COPY_KEYS.tooLong).toBe('search.guidance.tooLong')
    expect(SEARCH_COPY_KEYS.noResults.title).toBe('search.states.noResults.title')
    expect(SEARCH_COPY_KEYS.stale).toBe('search.states.stale.lastUpdated')
    expect(SEARCH_COPY_KEYS.interimEmpty).toBe('search.states.interimEmpty')
    expect(SEARCH_COPY_KEYS.endOfResults).toBe('search.states.endOfResults')
    expect(SEARCH_COPY_KEYS.pageError.title).toBe('search.states.pageError.title')
    expect(SEARCH_COPY_KEYS.loadingLabel).toBe('search.results.loadingLabel')
  })
})
