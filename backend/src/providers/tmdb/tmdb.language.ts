import type { ProviderLanguage } from '../../domain/catalog.js'

const PROVIDER_LANGUAGES: Readonly<Record<'en' | 'es', ProviderLanguage>> = Object.freeze({
  en: 'en-US',
  es: 'es-ES',
})

export type InterfaceLanguage = keyof typeof PROVIDER_LANGUAGES

export const isInterfaceLanguage = (value: unknown): value is InterfaceLanguage =>
  value === 'en' || value === 'es'

export const toProviderLanguage = (language: InterfaceLanguage): ProviderLanguage =>
  PROVIDER_LANGUAGES[language]
