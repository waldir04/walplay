import { useTranslation } from 'react-i18next'

import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Link } from '@/shared/ui'
import { RecommendationArea } from '@/widgets/recommendation-area'

export const HomePage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t('home.title')}
        </h1>
        <p className="max-w-prose text-text-muted">{t('app.tagline')}</p>
      </div>

      <section className="flex flex-col items-start gap-stack rounded-card border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-title text-text">{t('home.browse.title')}</h2>
        <p className="max-w-prose text-text-muted">{t('home.browse.description')}</p>
        <Link to="/browse" className="min-h-11 px-1 font-semibold">
          {t('home.browse.action')}
        </Link>
      </section>

      <RecommendationArea />
    </div>
  )
}
