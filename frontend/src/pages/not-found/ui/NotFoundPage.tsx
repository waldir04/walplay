import { useTranslation } from 'react-i18next'

import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Link } from '@/shared/ui'

export const NotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-title text-text">
          {t('states.notFound.title')}
        </h1>
        <p className="max-w-prose text-text-muted">{t('states.notFound.description')}</p>
      </div>

      <div>
        <Link to="/" className="min-h-11 px-1">
          {t('states.notFound.home')}
        </Link>
      </div>
    </div>
  )
}
