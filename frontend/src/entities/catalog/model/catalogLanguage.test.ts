import { describe, expect, it } from 'vitest'

import {
  LANGUAGE_TO_LOCALE,
  LANGUAGE_TO_PROVIDER,
  isInterfaceLanguage,
  toLocaleCode,
  toProviderLanguage,
} from './catalogLanguage'

describe('catalog language mapping', () => {
  it('maps interface languages to provider languages', () => {
    expect(toProviderLanguage('en')).toBe('en-US')
    expect(toProviderLanguage('es')).toBe('es-ES')
    expect(LANGUAGE_TO_PROVIDER).toEqual({ en: 'en-US', es: 'es-ES' })
  })

  it('maps interface languages to Intl locales', () => {
    expect(toLocaleCode('en')).toBe('en-US')
    expect(toLocaleCode('es')).toBe('es-ES')
    expect(LANGUAGE_TO_LOCALE).toEqual({ en: 'en-US', es: 'es-ES' })
  })

  it('recognizes only supported languages', () => {
    expect(isInterfaceLanguage('en')).toBe(true)
    expect(isInterfaceLanguage('es')).toBe(true)
    expect(isInterfaceLanguage('fr')).toBe(false)
  })
})
