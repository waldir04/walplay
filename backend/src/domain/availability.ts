export type AvailabilityCategory = 'subscription' | 'free' | 'ads' | 'rent' | 'buy'

export type AvailabilityState = 'available' | 'no-information' | 'unsupported-region'

export type AvailabilitySource = 'provider' | 'cache' | 'stale-cache'

export type AvailabilityFreshness = 'current' | 'stale'

export interface AvailabilityProviderLogo {
  readonly url: string
  readonly urlLarge?: string
}

export interface AvailabilityProviderEntry {
  readonly name: string
  readonly logo?: AvailabilityProviderLogo
}

export interface AvailabilityGroup {
  readonly category: AvailabilityCategory
  readonly providers: readonly AvailabilityProviderEntry[]
}

export interface AvailabilityDestination {
  readonly url: string
}

export interface AvailabilityData {
  readonly state: AvailabilityState
  readonly region: string
  readonly groups: readonly AvailabilityGroup[]
  readonly destination?: AvailabilityDestination
}

export interface AvailabilityMeta {
  readonly stale: boolean
  readonly lastUpdatedAt: string
  readonly source: AvailabilitySource
  readonly freshness: AvailabilityFreshness
  readonly sourceUpdatedAt?: string
}

export const AVAILABILITY_CATEGORY_ORDER: readonly AvailabilityCategory[] = Object.freeze([
  'subscription',
  'free',
  'ads',
  'rent',
  'buy',
])

export const AVAILABILITY_DEFAULT_REGION = 'CO'
export const AVAILABILITY_REGION_PATTERN = /^[A-Z]{2}$/

export const isAvailabilityRegion = (value: string): boolean =>
  AVAILABILITY_REGION_PATTERN.test(value)
