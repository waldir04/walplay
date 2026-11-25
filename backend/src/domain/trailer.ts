export type PromotionalType =
  | 'trailer'
  | 'teaser'
  | 'featurette'
  | 'clip'
  | 'behind-the-scenes'
  | 'bloopers'

export type TrailerPlatform = 'youtube'

export type TrailerInventoryState = 'available' | 'no-videos'

export type TrailerSource = 'provider' | 'cache' | 'stale-cache'

export type TrailerFreshness = 'current' | 'stale'

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export const TRAILER_TYPE_ORDER: readonly PromotionalType[] = Object.freeze([
  'trailer',
  'teaser',
  'featurette',
  'clip',
  'behind-the-scenes',
  'bloopers',
])

export const TRAILER_ELIGIBLE_TYPES: readonly PromotionalType[] = TRAILER_TYPE_ORDER

export const TRAILER_MAX_INVENTORY = 24

export const TRAILER_TYPE_RANK: Readonly<Record<PromotionalType, number>> = Object.freeze(
  TRAILER_TYPE_ORDER.reduce<Record<PromotionalType, number>>((ranks, type, index) => {
    ranks[type] = index
    return ranks
  }, {} as Record<PromotionalType, number>)
)

export interface TrailerVideo {
  readonly id: string
  readonly platform: TrailerPlatform
  readonly platformName: string
  readonly videoId: string
  readonly title: string
  readonly type: PromotionalType
  readonly official: boolean
  readonly language?: string
  readonly publishedAt?: string
  readonly embedUrl?: string
  readonly externalUrl?: string
}

export interface TrailerInventory {
  readonly state: TrailerInventoryState
  readonly videos: readonly TrailerVideo[]
}

export interface TrailerMeta {
  readonly stale: boolean
  readonly lastUpdatedAt: string
  readonly source: TrailerSource
  readonly freshness: TrailerFreshness
}

export interface TrailerSortKey {
  readonly type: PromotionalType
  readonly official: boolean
  readonly providerIndex: number
  readonly id: string
}

const typeRank = (type: PromotionalType): number => TRAILER_TYPE_RANK[type]

export const compareTrailerSortKeys = (left: TrailerSortKey, right: TrailerSortKey): number => {
  const byType = typeRank(left.type) - typeRank(right.type)
  if (byType !== 0) {
    return byType
  }
  if (left.official !== right.official) {
    return left.official ? -1 : 1
  }
  if (left.providerIndex !== right.providerIndex) {
    return left.providerIndex - right.providerIndex
  }
  if (left.id === right.id) {
    return 0
  }
  return left.id < right.id ? -1 : 1
}

export const sortTrailerSortKeys = <T extends TrailerSortKey>(items: readonly T[]): readonly T[] =>
  [...items].sort(compareTrailerSortKeys)
