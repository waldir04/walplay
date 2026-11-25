import { useTranslation } from 'react-i18next'

export const RecommendationExplanation = () => {
  const { t } = useTranslation()

  return (
    <details className="rounded-card border border-border bg-surface px-4 py-3">
      <summary className="min-h-11 cursor-pointer font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        {t('recommendations.explanation.summary')}
      </summary>
      <div className="mt-3 flex max-w-prose flex-col gap-2 text-caption text-text-muted">
        <p>{t('recommendations.explanation.basis')}</p>
        <p>{t('recommendations.explanation.savedTitles')}</p>
        <p>{t('recommendations.explanation.noAi')}</p>
        <p>{t('recommendations.explanation.scope')}</p>
        <p>{t('recommendations.explanation.retention')}</p>
        <p>{t('recommendations.explanation.controls')}</p>
      </div>
    </details>
  )
}
