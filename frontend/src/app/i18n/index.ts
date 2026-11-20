import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { SUPPORTED_LOCALE_CODES, type SupportedLocaleCode } from '@/shared/config/constants'
import en from '@/shared/i18n/resources/en.json'
import es from '@/shared/i18n/resources/es.json'

import { resolveInitialLanguage } from './resolveInitialLanguage'

const resources = {
  en: { translation: en },
  es: { translation: es },
}

const syncDocumentLanguage = (language: string): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage().locale,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALE_CODES],
  initImmediate: false,
  showSupportNotice: false,
  interpolation: { escapeValue: false },
  defaultNS: 'translation',
  returnNull: false,
  react: { useSuspense: false },
})

syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export const changeLanguage = async (locale: SupportedLocaleCode): Promise<void> => {
  await i18n.changeLanguage(locale)
}

export { i18n }
export default i18n
