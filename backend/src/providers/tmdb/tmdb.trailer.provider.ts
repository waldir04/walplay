import type { TrailerProvider } from '../trailer-provider.js'
import type { TmdbClient } from './tmdb.client.js'
import { ProviderHttpError } from './tmdb.errors.js'
import { mapTmdbTrailers } from './tmdb.trailer.mapper.js'
import { tmdbTrailerDto } from './tmdb.trailer.schemas.js'

export interface TmdbTrailerProviderDependencies {
  readonly client: TmdbClient
  readonly embedHosts: readonly string[]
  readonly externalHosts: readonly string[]
  readonly maxInventory?: number
  readonly now?: () => number
}

export const createTmdbTrailerProvider = ({
  client,
  embedHosts,
  externalHosts,
  maxInventory,
  now = Date.now,
}: TmdbTrailerProviderDependencies): TrailerProvider => {
  const fetchTrailers: TrailerProvider['fetchTrailers'] = async ({ mediaType, providerId }) => {
    try {
      const raw = await client.request(
        `/${mediaType}/${providerId}/videos`,
        {},
        tmdbTrailerDto
      )
      const videos = mapTmdbTrailers(
        { results: raw.results },
        {
          now: now(),
          embedHosts,
          externalHosts,
          ...(maxInventory === undefined ? {} : { maxInventory }),
        }
      )
      return { videos }
    } catch (error) {
      if (error instanceof ProviderHttpError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  return Object.freeze({ id: 'tmdb', fetchTrailers })
}
