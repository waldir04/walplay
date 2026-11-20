import { describe, expect, it } from 'vitest'

import { i18n } from '@/app/i18n'
import en from '@/shared/i18n/resources/en.json'
import es from '@/shared/i18n/resources/es.json'

describe('missing translations', () => {
  it('falls back to English without exposing raw keys, undefined, or empty output', async () => {
    await i18n.changeLanguage('es')
    i18n.removeResourceBundle('es', 'translation')

    try {
      const value = i18n.t('home.title')

      expect(value).toBe(en.home.title)
      expect(value).not.toBe('home.title')
      expect(value).not.toContain('undefined')
      expect(value.length).toBeGreaterThan(0)
    } finally {
      i18n.addResourceBundle('es', 'translation', es)
      await i18n.changeLanguage('en')
    }
  })
})
