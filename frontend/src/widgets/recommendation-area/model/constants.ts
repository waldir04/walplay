import type { CatalogItem, CatalogResponseMeta, MediaType } from '@/entities/catalog'

export const RECOMMENDATION_MAX_ITEMS = 12
export const RECOMMENDATION_SKELETON_CARD_COUNT = 5
export const RECOMMENDATION_DEFAULT_MEDIA_TYPE = 'movie'
export const RECOMMENDATION_MEDIA_TYPES = Object.freeze(['movie', 'tv'] as const)
export const RECOMMENDATION_FALLBACK_SECTION = 'popular'
export const RECOMMENDATION_FALLBACK_PAGE = 1
export const RECOMMENDATION_SECTION_BASIS = 'provider-popularity'

export type RecommendationMediaScope = MediaType
export type RecommendationSectionBasis = typeof RECOMMENDATION_SECTION_BASIS
export type RecommendationCandidate = CatalogItem
export type RecommendationEmptyCause = 'no-provider-items' | 'all-excluded'
export type RecommendationErrorCause = 'rate-limited' | 'timed-out' | 'unavailable'

export const RECOMMENDATION_MEDIA_SCOPE_LABEL_KEYS: Readonly<
  Record<RecommendationMediaScope, string>
> = Object.freeze({
  movie: 'recommendations.section.mediaScope.movie',
  tv: 'recommendations.section.mediaScope.tv',
})

export interface RecommendationExclusionInput {
  readonly savedIdentities: ReadonlySet<string>
  readonly dismissedIdentities: ReadonlySet<string>
}

export interface RecommendationItemView {
  readonly item: RecommendationCandidate
  readonly basis: RecommendationSectionBasis
}

export type RecommendationSectionState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly basis: RecommendationSectionBasis
      readonly mediaScope: RecommendationMediaScope
      readonly items: readonly RecommendationItemView[]
      readonly stale: boolean
      readonly lastUpdatedAt?: string
    }
  | { readonly kind: 'empty'; readonly cause: RecommendationEmptyCause }
  | { readonly kind: 'error'; readonly cause: RecommendationErrorCause }

export interface RecommendationExplanationFlags {
  readonly basis: RecommendationSectionBasis
  readonly savedTitlesUsedToChoose: false
  readonly usesAiOrMl: false
  readonly createsProfile: false
}

export interface RecommendationAreaView {
  readonly enabled: boolean
  readonly scope: 'guest'
  readonly mediaScope: RecommendationMediaScope
  readonly section: RecommendationSectionState
  readonly explanation: RecommendationExplanationFlags
}

export interface RecommendationStateCopyKeys {
  readonly title: string
  readonly description: string
}

export const RECOMMENDATION_STATE_COPY_KEYS = Object.freeze({
  loading: 'recommendations.states.loading',
  empty: Object.freeze({
    'no-provider-items': Object.freeze({
      title: 'recommendations.states.empty.noProvider.title',
      description: 'recommendations.states.empty.noProvider.description',
    }),
    'all-excluded': Object.freeze({
      title: 'recommendations.states.empty.allExcluded.title',
      description: 'recommendations.states.empty.allExcluded.description',
    }),
  }),
  error: Object.freeze({
    'rate-limited': Object.freeze({
      title: 'recommendations.states.error.rateLimited.title',
      description: 'recommendations.states.error.rateLimited.description',
    }),
    'timed-out': Object.freeze({
      title: 'recommendations.states.error.timedOut.title',
      description: 'recommendations.states.error.timedOut.description',
    }),
    unavailable: Object.freeze({
      title: 'recommendations.states.error.title',
      description: 'recommendations.states.error.description',
    }),
  }),
  stale: Object.freeze({
    label: 'recommendations.states.stale.label',
    lastUpdated: 'recommendations.states.stale.lastUpdated',
  }),
})

export interface RecommendationQuerySnapshot {
  readonly status: 'pending' | 'success' | 'error'
  readonly rawItemCount: number
  readonly error: unknown
}

export type RecommendationMeta = Pick<CatalogResponseMeta, 'stale' | 'lastUpdatedAt'>
