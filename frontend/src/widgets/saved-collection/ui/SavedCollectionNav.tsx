import { useTranslation } from 'react-i18next'

import type { CollectionId } from '@/entities/saved-library'
import {
  SAVED_COLLECTION_PATHS,
  SAVED_COLLECTIONS,
  SAVED_TITLE_KEY,
} from '@/entities/saved-library'
import { Link } from '@/shared/ui'

export interface SavedCollectionNavProps {
  readonly activeCollection: CollectionId
}

export const SavedCollectionNav = ({ activeCollection }: SavedCollectionNavProps) => {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('saved.nav.label')} className="flex flex-wrap gap-2">
      {SAVED_COLLECTIONS.map((collection) => (
        <Link
          key={collection}
          to={SAVED_COLLECTION_PATHS[collection]}
          aria-current={collection === activeCollection ? 'page' : undefined}
          className="inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[current=page]:border-primary aria-[current=page]:text-primary"
        >
          {t(SAVED_TITLE_KEY[collection])}
        </Link>
      ))}
    </nav>
  )
}
