import type {
  AvailabilityDestination,
  AvailabilityGroup,
} from '../domain/availability.js'
import type { MediaType } from '../domain/catalog.js'

export type AvailabilityProviderId = 'tmdb'

export interface ProviderAvailability {
  readonly groups: readonly AvailabilityGroup[]
  readonly destination?: AvailabilityDestination
  readonly sourceUpdatedAt?: string
}

export interface AvailabilityProviderRequest {
  readonly mediaType: MediaType
  readonly providerId: number
  readonly region: string
}

export interface AvailabilityProvider {
  readonly id: AvailabilityProviderId
  readonly fetchAvailability: (
    input: AvailabilityProviderRequest
  ) => Promise<ProviderAvailability | null>
}
