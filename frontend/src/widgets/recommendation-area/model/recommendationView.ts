import type { CatalogItem } from '@/entities/catalog'

import { RECOMMENDATION_SECTION_BASIS } from './constants'
import type {
  RecommendationAreaView,
  RecommendationExclusionInput,
  RecommendationMeta,
  RecommendationMediaScope,
  RecommendationQuerySnapshot,
} from './constants'
import { selectFallbackCandidates } from './fallbackCandidates'
import { deriveRecommendationSectionState } from './recommendationState'

export interface RecommendationViewInput {
  readonly enabled: boolean
  readonly mediaScope: RecommendationMediaScope
  readonly savedIdentities: ReadonlySet<string>
  readonly queryState: RecommendationQuerySnapshot
  readonly items: readonly CatalogItem[]
  readonly meta?: RecommendationMeta
}

const EMPTY_DISMISSALS: ReadonlySet<string> = new Set<string>()

export const deriveRecommendationAreaView = ({
  enabled,
  mediaScope,
  savedIdentities,
  queryState,
  items,
  meta,
}: RecommendationViewInput): RecommendationAreaView => {
  const exclusionInput: RecommendationExclusionInput = {
    savedIdentities,
    dismissedIdentities: EMPTY_DISMISSALS,
  }
  const eligibleItems = selectFallbackCandidates(items, exclusionInput)

  return {
    enabled,
    scope: 'guest',
    mediaScope,
    section: deriveRecommendationSectionState({
      mediaScope,
      snapshot: queryState,
      eligibleItems,
      ...(meta === undefined ? {} : { meta }),
    }),
    explanation: {
      basis: RECOMMENDATION_SECTION_BASIS,
      savedTitlesUsedToChoose: false,
      usesAiOrMl: false,
      createsProfile: false,
    },
  }
}
