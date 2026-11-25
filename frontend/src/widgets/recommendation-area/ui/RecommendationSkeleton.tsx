import { CatalogCardSkeleton } from '@/entities/catalog'
import { Skeleton } from '@/shared/ui'

import { RECOMMENDATION_SKELETON_CARD_COUNT } from '../model/constants'

export const RecommendationSkeleton = () => (
  <div className="flex min-w-0 flex-col gap-3">
    <Skeleton className="h-6 w-48 max-w-full" />
    <Skeleton className="h-4 w-64 max-w-full" />
    <ul
      aria-hidden="true"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {Array.from({ length: RECOMMENDATION_SKELETON_CARD_COUNT }, (_, index) => (
        <li key={index}>
          <CatalogCardSkeleton />
        </li>
      ))}
    </ul>
  </div>
)
