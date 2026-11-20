import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from './index'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('i18n initialization', () => {
  it('is initialized synchronously with both bundled resources', () => {
    expect(i18n.isInitialized).toBe(true)
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
    expect(i18n.hasResourceBundle('es', 'translation')).toBe(true)
    expect(i18n.options.fallbackLng).toEqual(['en'])
  })

  it('resolves English by default and falls back to English for missing keys', () => {
    expect(i18n.t('app.name')).toBe('Walplay')
    expect(i18n.t('settings.title')).toBe('Settings')
  })

  it('updates the document language when the language changes', async () => {
    await i18n.changeLanguage('es')

    expect(document.documentElement.lang).toBe('es')
    expect(i18n.t('navigation.home')).toBe('Inicio')
    expect(i18n.isInitialized).toBe(true)
  })
})
