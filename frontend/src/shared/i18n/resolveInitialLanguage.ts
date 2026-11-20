import { SUPPORTED_LOCALE_CODES, type SupportedLocaleCode } from '@/shared/config/constants'
import {
  readLanguagePreference,
  type PersistenceStatus,
  type ReadPreferenceResult,
} from '@/shared/lib/languageStorage'

export type LanguageOrigin = 'explicit' | 'detected' | 'fallback'

export interface InitialLanguage {
  readonly locale: SupportedLocaleCode
  readonly origin: LanguageOrigin
  readonly persistence: PersistenceStatus
}

export interface ResolveInitialLanguageOptions {
  readonly storage?: Storage | null
  readonly languages?: readonly string[]
}

const baseSubtag = (language: string): string => language.split('-')[0]?.toLowerCase() ?? ''

const isSupportedLocale = (value: string): value is SupportedLocaleCode =>
  (SUPPORTED_LOCALE_CODES as readonly string[]).includes(value)

const readBrowserLanguages = (): readonly string[] => {
  if (typeof navigator === 'undefined') {
    return []
  }

  const languages = navigator.languages
  if (Array.isArray(languages) && languages.length > 0) {
    return languages
  }

  return typeof navigator.language === 'string' && navigator.language.length > 0
    ? [navigator.language]
    : []
}

export const resolveInitialLanguage = (
  options: ResolveInitialLanguageOptions = {}
): InitialLanguage => {
  const read: ReadPreferenceResult =
    options.storage === undefined
      ? readLanguagePreference()
      : readLanguagePreference(options.storage)

  if (read.status === 'stored' && read.locale) {
    return { locale: read.locale, origin: 'explicit', persistence: 'stored' }
  }

  const languages = options.languages ?? readBrowserLanguages()
  for (const language of languages) {
    const base = baseSubtag(language)
    if (isSupportedLocale(base)) {
      return { locale: base, origin: 'detected', persistence: read.status }
    }
  }

  return { locale: 'en', origin: 'fallback', persistence: read.status }
}
