import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/features/switch-language'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'

export const SettingsPage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-title text-text">
          {t('settings.title')}
        </h1>
        <p className="max-w-prose text-text-muted">{t('settings.description')}</p>
      </div>

      <section
        aria-labelledby="settings-language-heading"
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
      >
        <h2 id="settings-language-heading" className="text-title text-text">
          {t('settings.language.label')}
        </h2>
        <LanguageSwitcher
          groupLabel={t('settings.language.label')}
          helperText={t('settings.language.helper')}
        />
        <p className="max-w-prose text-caption text-text-muted">
          {t('settings.language.storageNotice')}
        </p>
      </section>
    </div>
  )
}
