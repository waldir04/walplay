import type { MediaType } from '../domain/catalog.js'
import type { TrailerVideo } from '../domain/trailer.js'

export interface ProviderTrailerInventory {
  readonly videos: readonly TrailerVideo[]
}

export interface TrailerIdentityInput {
  readonly mediaType: MediaType
  readonly providerId: number
}

export interface TrailerProvider {
  readonly id: 'tmdb'
  readonly fetchTrailers: (input: TrailerIdentityInput) => Promise<ProviderTrailerInventory | null>
}
