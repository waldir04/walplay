import { useTranslation } from 'react-i18next'

import tmdbMarkUrl from '@/shared/assets/tmdb-logo.svg?url'

export const ProviderAttribution = () => {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('catalog.attribution.sectionLabel')}
      className="mt-section flex flex-col gap-2 rounded-card border border-border bg-surface p-4 text-caption text-text-muted sm:flex-row sm:items-center"
    >
      <img
        src={tmdbMarkUrl}
        alt={t('catalog.attribution.logoAlt')}
        className="h-6 w-auto self-start"
      />
      <p className="max-w-prose">{t('catalog.attribution.statement')}</p>
    </section>
  )
}
