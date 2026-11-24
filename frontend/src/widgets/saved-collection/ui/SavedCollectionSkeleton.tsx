import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/ui'

const SKELETON_ROWS = 3

export const SavedCollectionSkeleton = () => {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('saved.loading.label')}
      className="flex flex-col gap-3"
    >
      {Array.from({ length: SKELETON_ROWS }, (_value, index) => (
        <div key={index} className="flex gap-3 rounded-card border border-border bg-surface p-3">
          <Skeleton className="aspect-[2/3] w-16 shrink-0" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
