import type { SupportedLocaleCode } from '@/shared/config/constants'

export type InterfaceLanguage = SupportedLocaleCode

export const LANGUAGE_TO_PROVIDER: Readonly<Record<InterfaceLanguage, 'en-US' | 'es-ES'>> =
  Object.freeze({
    en: 'en-US',
    es: 'es-ES',
  })

export const LANGUAGE_TO_LOCALE: Readonly<Record<InterfaceLanguage, string>> = Object.freeze({
  en: 'en-US',
  es: 'es-ES',
})

export const isInterfaceLanguage = (value: unknown): value is InterfaceLanguage =>
  value === 'en' || value === 'es'

export const toProviderLanguage = (language: InterfaceLanguage): 'en-US' | 'es-ES' =>
  LANGUAGE_TO_PROVIDER[language]

export const toLocaleCode = (language: InterfaceLanguage): string => LANGUAGE_TO_LOCALE[language]
