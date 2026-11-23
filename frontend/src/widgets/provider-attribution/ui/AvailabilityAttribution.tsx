import { useTranslation } from 'react-i18next'

export const AvailabilityAttribution = () => {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('detail.availability.attribution.sectionLabel')}
      className="text-caption text-text-muted"
    >
      <p className="max-w-prose">{t('detail.availability.attribution.justWatch')}</p>
    </section>
  )
}
