import type { AvailabilityProvider } from '../availability-provider.js'
import type { TmdbClient } from './tmdb.client.js'
import type { ImageResolver } from './tmdb.images.js'
import { watchProvidersDto } from './tmdb.availability.schemas.js'
import { mapTmdbRegionAvailability } from './tmdb.availability.mapper.js'

export interface TmdbAvailabilityProviderDependencies {
  readonly client: TmdbClient
  readonly images: ImageResolver
  readonly logosEnabled: boolean
  readonly destinationHosts: readonly string[]
}

export const createTmdbAvailabilityProvider = ({
  client,
  images,
  logosEnabled,
  destinationHosts,
}: TmdbAvailabilityProviderDependencies): AvailabilityProvider => {
  const fetchAvailability: AvailabilityProvider['fetchAvailability'] = async ({
    mediaType,
    providerId,
    region,
  }) => {
    if (logosEnabled) {
      await images.ensureReady()
    }

    const raw = await client.request(
      `/${mediaType}/${providerId}/watch/providers`,
      {},
      watchProvidersDto
    )
    const entry = raw.results?.[region]
    if (entry === undefined || entry === null) {
      return null
    }

    return mapTmdbRegionAvailability({
      entry,
      region,
      logosEnabled,
      resolveLogo: images.resolveProviderLogo,
      allowedDestinationHosts: destinationHosts,
    })
  }

  return Object.freeze({ id: 'tmdb', fetchAvailability })
}
