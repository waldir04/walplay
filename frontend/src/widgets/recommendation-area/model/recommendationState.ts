import { stateForError } from '@/entities/catalog'

import type {
  RecommendationErrorCause,
  RecommendationItemView,
  RecommendationMediaScope,
  RecommendationMeta,
  RecommendationQuerySnapshot,
  RecommendationSectionState,
} from './constants'
import { RECOMMENDATION_SECTION_BASIS } from './constants'

export interface RecommendationSectionStateInput {
  readonly mediaScope: RecommendationMediaScope
  readonly snapshot: RecommendationQuerySnapshot
  readonly eligibleItems: readonly RecommendationItemView[]
  readonly meta?: RecommendationMeta
}

export const recommendationErrorCause = (error: unknown): RecommendationErrorCause => {
  const state = stateForError(error)
  if (state === 'rate-limited') {
    return 'rate-limited'
  }
  if (state === 'timed-out') {
    return 'timed-out'
  }
  return 'unavailable'
}

export const deriveRecommendationSectionState = ({
  mediaScope,
  snapshot,
  eligibleItems,
  meta,
}: RecommendationSectionStateInput): RecommendationSectionState => {
  if (snapshot.status === 'pending') {
    return { kind: 'loading' }
  }
  if (snapshot.status === 'error') {
    return { kind: 'error', cause: recommendationErrorCause(snapshot.error) }
  }
  if (snapshot.rawItemCount === 0) {
    return { kind: 'empty', cause: 'no-provider-items' }
  }
  if (eligibleItems.length === 0) {
    return { kind: 'empty', cause: 'all-excluded' }
  }

  return {
    kind: 'ready',
    basis: RECOMMENDATION_SECTION_BASIS,
    mediaScope,
    items: eligibleItems,
    stale: meta?.stale === true,
    ...(meta?.lastUpdatedAt === undefined ? {} : { lastUpdatedAt: meta.lastUpdatedAt }),
  }
}
