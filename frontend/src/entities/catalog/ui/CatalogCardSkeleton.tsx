import { Skeleton } from '@/shared/ui'

export const CatalogCardSkeleton = () => (
  <div aria-hidden="true" className="flex w-full flex-col gap-2">
    <Skeleton className="aspect-[2/3] w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
)
