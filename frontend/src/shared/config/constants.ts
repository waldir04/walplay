export const LANGUAGE_STORAGE_KEY = 'walplay.language.v1'
export const LANGUAGE_STORAGE_VERSION = 1
export const DEFAULT_APPLICATION_VERSION = '0.0.0'
export const DEFAULT_API_BASE_URL = 'http://localhost:4000'
export const SUPPORTED_LOCALE_CODES = ['en', 'es'] as const
export type SupportedLocaleCode = (typeof SUPPORTED_LOCALE_CODES)[number]
export const WIDE_LAYOUT_BREAKPOINT = 768
export const MAIN_CONTENT_ID = 'main-content'
