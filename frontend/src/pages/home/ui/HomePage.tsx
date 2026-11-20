import { useTranslation } from 'react-i18next'

import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { EmptyState } from '@/shared/ui'

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

      <EmptyState title={t('home.empty.title')} description={t('home.empty.description')} />
    </div>
  )
}
