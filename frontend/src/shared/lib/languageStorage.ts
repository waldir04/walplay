import { z } from 'zod'

import {
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_STORAGE_VERSION,
  SUPPORTED_LOCALE_CODES,
  type SupportedLocaleCode,
} from '@/shared/config/constants'

const storedPreferenceSchema = z
  .object({
    version: z.literal(LANGUAGE_STORAGE_VERSION),
    locale: z.enum(SUPPORTED_LOCALE_CODES),
  })
  .strict()

export type PersistenceStatus = 'stored' | 'absent' | 'invalid' | 'unavailable'

export interface ReadPreferenceResult {
  readonly status: PersistenceStatus
  readonly locale?: SupportedLocaleCode
}

const resolveStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') {
      return null
    }
    return window.localStorage
  } catch {
    return null
  }
}

export const readLanguagePreference = (
  storage: Storage | null = resolveStorage()
): ReadPreferenceResult => {
  if (!storage) {
    return { status: 'unavailable' }
  }

  let rawValue: string | null
  try {
    rawValue = storage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }

  if (rawValue === null) {
    return { status: 'absent' }
  }

  try {
    const parsed: unknown = JSON.parse(rawValue)
    const result = storedPreferenceSchema.safeParse(parsed)
    if (!result.success) {
      return { status: 'invalid' }
    }
    return { status: 'stored', locale: result.data.locale }
  } catch {
    return { status: 'invalid' }
  }
}

export const writeLanguagePreference = (
  locale: SupportedLocaleCode,
  storage: Storage | null = resolveStorage()
): PersistenceStatus => {
  if (!storage) {
    return 'unavailable'
  }

  try {
    storage.setItem(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify({ version: LANGUAGE_STORAGE_VERSION, locale })
    )
    return 'stored'
  } catch {
    return 'unavailable'
  }
}
