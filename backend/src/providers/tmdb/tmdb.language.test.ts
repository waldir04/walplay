import { describe, expect, it } from 'vitest'

import { isInterfaceLanguage, toProviderLanguage } from './tmdb.language.js'

describe('provider language mapping', () => {
  it('maps the supported interface locales', () => {
    expect(toProviderLanguage('en')).toBe('en-US')
    expect(toProviderLanguage('es')).toBe('es-ES')
  })

  it('rejects unsupported interface locales', () => {
    expect(isInterfaceLanguage('en')).toBe(true)
    expect(isInterfaceLanguage('es')).toBe(true)
    expect(isInterfaceLanguage('fr')).toBe(false)
    expect(isInterfaceLanguage(undefined)).toBe(false)
  })
})
