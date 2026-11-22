import { describe, expect, it } from 'vitest'

import {
  ERROR_CODE_TO_STATE,
  STATE_COPY_KEYS,
  stateCopyKeys,
  stateForError,
  stateForErrorCode,
} from './catalogError'

describe('catalog error mapping', () => {
  it('maps every stable code to a localized catalog state', () => {
    for (const [code, state] of Object.entries(ERROR_CODE_TO_STATE)) {
      expect(stateForErrorCode(code as keyof typeof ERROR_CODE_TO_STATE)).toBe(state)
      const keys = stateCopyKeys(state)
      expect(keys.title.startsWith('catalog.states.')).toBe(true)
      expect(keys.description.startsWith('catalog.states.')).toBe(true)
    }
  })

  it('distinguishes not-found, rate-limited, timed-out, and unavailable states', () => {
    expect(stateForErrorCode('CATALOG_NOT_FOUND')).toBe('not-found')
    expect(stateForErrorCode('CATALOG_RATE_LIMITED')).toBe('rate-limited')
    expect(stateForErrorCode('CATALOG_TIMEOUT')).toBe('timed-out')
    expect(stateForErrorCode('CATALOG_UNAVAILABLE')).toBe('unavailable')
    expect(stateForErrorCode('CATALOG_INVALID_RESPONSE')).toBe('unavailable')
  })

  it('never maps raw status codes or technical details to interface copy', () => {
    const serialized = JSON.stringify(STATE_COPY_KEYS)
    expect(serialized).not.toContain('502')
    expect(serialized).not.toContain('TMDB')
    expect(stateForError({ status: 502 })).toBe('unavailable')
    expect(stateForError(new Error('raw text'))).toBe('unavailable')
  })

  it('maps unknown error codes safely', () => {
    expect(stateForError({ code: 'SOMETHING_ELSE' })).toBe('unavailable')
    expect(stateForError(null)).toBe('unavailable')
  })
})
