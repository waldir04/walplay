import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SupportedLocaleCode } from '@/shared/config/constants'
import { resolveInitialLanguage, type LanguageOrigin } from '@/shared/i18n/resolveInitialLanguage'
import type { PersistenceStatus } from '@/shared/lib/languageStorage'
import { writeLanguagePreference } from '@/shared/lib/languageStorage'

export interface LanguagePreference {
  readonly locale: SupportedLocaleCode
  readonly origin: LanguageOrigin
  readonly persistence: PersistenceStatus
  readonly announcement: string
  readonly setLocale: (locale: SupportedLocaleCode) => void
}

export const useLanguagePreference = (): LanguagePreference => {
  const initial = useRef(resolveInitialLanguage())
  const { i18n } = useTranslation()
  const [locale, setLocaleState] = useState<SupportedLocaleCode>(initial.current.locale)
  const [origin, setOrigin] = useState<LanguageOrigin>(initial.current.origin)
  const [persistence, setPersistence] = useState<PersistenceStatus>(initial.current.persistence)
  const [announcement, setAnnouncement] = useState('')

  const setLocale = useCallback(
    (nextLocale: SupportedLocaleCode) => {
      setLocaleState(nextLocale)
      setOrigin('explicit')

      void i18n.changeLanguage(nextLocale).then(() => {
        const writeStatus = writeLanguagePreference(nextLocale)
        setPersistence(writeStatus)
        setAnnouncement(
          i18n.t('a11y.languageChanged', {
            language: i18n.t(`languages.${nextLocale}`),
          })
        )
      })
    },
    [i18n]
  )

  return { locale, origin, persistence, announcement, setLocale }
}
