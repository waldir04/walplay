import { useTranslation } from 'react-i18next'

import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Link } from '@/shared/ui'

export const CatalogNotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-stack">
      <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
        {t('catalog.states.notFound.title')}
      </h1>
      <p className="max-w-prose text-text-muted">{t('catalog.states.notFound.description')}</p>
      <Link to="/browse/movies" className="min-h-11 w-fit px-1">
        {t('catalog.actions.returnToCatalog')}
      </Link>
    </div>
  )
}
