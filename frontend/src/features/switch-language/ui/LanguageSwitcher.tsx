import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LOCALE_CODES } from '@/shared/config/constants'
import { LiveRegion } from '@/shared/ui'

import { useLanguagePreference } from '../model/useLanguagePreference'

export interface LanguageSwitcherProps {
  groupLabel: string
  helperText?: string
}

export const LanguageSwitcher = ({ groupLabel, helperText }: LanguageSwitcherProps) => {
  const { t } = useTranslation()
  const { locale, announcement, setLocale } = useLanguagePreference()
  const groupName = useId()

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="sr-only">{groupLabel}</legend>
        {helperText ? <p className="text-caption text-text-muted">{helperText}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {SUPPORTED_LOCALE_CODES.map((code) => (
            <label
              key={code}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface px-3 py-2 text-text transition-colors duration-150 ease-out hover:bg-surface-raised"
            >
              <input
                type="radio"
                name={groupName}
                value={code}
                checked={locale === code}
                onChange={() => setLocale(code)}
                className="h-4 w-4 accent-primary"
              />
              <span>{t(`languages.${code}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <LiveRegion message={announcement} />
    </div>
  )
}
