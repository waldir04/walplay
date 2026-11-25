import { CATALOG_ITEM_ID_PATTERN } from '@/entities/catalog'
import type { CatalogItem } from '@/entities/catalog'
import { savedIdentity } from '@/entities/saved-library'

import { RECOMMENDATION_MAX_ITEMS, RECOMMENDATION_SECTION_BASIS } from './constants'
import type {
  RecommendationExclusionInput,
  RecommendationItemView,
  RecommendationMediaScope,
} from './constants'

const EMPTY_IDENTITIES: ReadonlySet<string> = new Set<string>()

export const EMPTY_EXCLUSION_INPUT: RecommendationExclusionInput = Object.freeze({
  savedIdentities: EMPTY_IDENTITIES,
  dismissedIdentities: EMPTY_IDENTITIES,
})

const isSupportedMediaScope = (value: unknown): value is RecommendationMediaScope =>
  value === 'movie' || value === 'tv'

const isAdultFlagged = (item: CatalogItem): boolean =>
  (item as { readonly adult?: unknown }).adult === true

const hasUsableIdentity = (item: CatalogItem): boolean =>
  isSupportedMediaScope(item.mediaType) && CATALOG_ITEM_ID_PATTERN.test(item.id)

const hasDisplayableName = (item: CatalogItem): boolean =>
  typeof item.title === 'string' && item.title.trim().length > 0

export const selectFallbackCandidates = (
  items: readonly CatalogItem[],
  input: RecommendationExclusionInput,
  cap: number = RECOMMENDATION_MAX_ITEMS
): RecommendationItemView[] => {
  const selected: RecommendationItemView[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (selected.length >= cap) {
      break
    }
    if (!hasUsableIdentity(item) || isAdultFlagged(item) || !hasDisplayableName(item)) {
      continue
    }

    const identity = savedIdentity(item.mediaType, item.id)
    if (
      input.savedIdentities.has(identity) ||
      input.dismissedIdentities.has(identity) ||
      seen.has(identity)
    ) {
      continue
    }

    seen.add(identity)
    selected.push(Object.freeze({ item, basis: RECOMMENDATION_SECTION_BASIS }))
  }

  return selected
}
