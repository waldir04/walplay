import { describe, expect, it } from 'vitest'

import {
  TRAILER_TYPE_LABEL_KEYS,
  formatTrailerLanguage,
  formatTrailerPublishedAt,
  resetTrailerFormattingCaches,
  trailerTypeLabelKey,
} from './trailerFormatting'

describe('trailer formatting', () => {
  it('maps every promotional type to a namespaced label key', () => {
    resetTrailerFormattingCaches()
    expect(trailerTypeLabelKey('behind-the-scenes')).toBe('detail.trailers.types.behindTheScenes')
    for (const key of Object.values(TRAILER_TYPE_LABEL_KEYS)) {
      expect(key.startsWith('detail.trailers.types.')).toBe(true)
    }
  })

  it('labels a usable language in the interface locale', () => {
    resetTrailerFormattingCaches()
    expect(formatTrailerLanguage('en', 'en')).toBe('English')
    expect(formatTrailerLanguage('es', 'es')).toBe('español')
  })

  it('returns no label for missing, malformed, or unresolved codes', () => {
    resetTrailerFormattingCaches()
    expect(formatTrailerLanguage(undefined, 'en')).toBeUndefined()
    expect(formatTrailerLanguage('english', 'en')).toBeUndefined()
    expect(formatTrailerLanguage('zz', 'en')).toBeUndefined()
  })

  it('formats valid, non-future publication dates', () => {
    const now = Date.parse('2026-11-24T12:00:00.000Z')
    expect(formatTrailerPublishedAt('2026-01-15T12:00:00.000Z', 'en', now)).toBe('Jan 15, 2026')
    expect(formatTrailerPublishedAt('2026-01-15T12:00:00.000Z', 'es', now)).toBe('15 ene 2026')
  })

  it('omits missing, invalid, and future dates', () => {
    const now = Date.parse('2026-11-24T12:00:00.000Z')
    expect(formatTrailerPublishedAt(undefined, 'en', now)).toBeUndefined()
    expect(formatTrailerPublishedAt('not-a-date', 'en', now)).toBeUndefined()
    expect(formatTrailerPublishedAt('2999-01-01T00:00:00.000Z', 'en', now)).toBeUndefined()
  })
})
