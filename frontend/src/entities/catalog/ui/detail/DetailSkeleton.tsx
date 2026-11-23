import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/ui'

export const DetailSkeleton = () => {
  const { t } = useTranslation()

  return (
    <section
      aria-busy="true"
      aria-label={t('detail.states.loading')}
      className="flex flex-col gap-section rounded-card border border-border bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="w-full max-w-48 shrink-0 md:max-w-56">
          <Skeleton className="aspect-[2/3] w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </section>
  )
}
