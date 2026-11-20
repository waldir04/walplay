import { describe, expect, it } from 'vitest'

import { LANGUAGE_STORAGE_KEY } from '@/shared/config/constants'

import { resolveInitialLanguage } from './resolveInitialLanguage'

const storageWith = (value: string | null): Storage => ({
  length: value === null ? 0 : 1,
  clear: () => undefined,
  getItem: () => value,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
})

const throwingStorage = (): Storage => ({
  length: 0,
  clear: () => undefined,
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError')
  },
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
})

describe('resolveInitialLanguage', () => {
  it('prefers a valid stored preference', () => {
    const result = resolveInitialLanguage({
      storage: storageWith(JSON.stringify({ version: 1, locale: 'es' })),
      languages: ['en-US'],
    })

    expect(result).toEqual({ locale: 'es', origin: 'explicit', persistence: 'stored' })
  })

  it.each([
    [['es-MX', 'en-US'], 'es'],
    [['es-419'], 'es'],
    [['en-GB'], 'en'],
    [['fr-FR', 'es-ES'], 'es'],
    [['fr-FR', 'de-DE'], 'en'],
    [[], 'en'],
  ])('detects the base language from %j', (languages, expected) => {
    const result = resolveInitialLanguage({ storage: storageWith(null), languages })

    expect(result.locale).toBe(expected)
  })

  it('reports fallback when no browser language is supported', () => {
    const result = resolveInitialLanguage({
      storage: storageWith(null),
      languages: ['fr-FR', 'de-DE'],
    })

    expect(result).toEqual({ locale: 'en', origin: 'fallback', persistence: 'absent' })
  })

  it('reports unavailable storage and still detects the browser language', () => {
    const result = resolveInitialLanguage({
      storage: throwingStorage(),
      languages: ['es-MX'],
    })

    expect(result).toEqual({ locale: 'es', origin: 'detected', persistence: 'unavailable' })
  })

  it('ignores invalid stored values and falls back to detection', () => {
    const result = resolveInitialLanguage({
      storage: storageWith('{broken'),
      languages: ['es-ES'],
    })

    expect(result).toEqual({ locale: 'es', origin: 'detected', persistence: 'invalid' })
  })

  it('uses the persisted key from the shared constants contract', () => {
    expect(LANGUAGE_STORAGE_KEY).toBe('walplay.language.v1')
  })
})
