import { useQuery } from '@tanstack/react-query'

import type { MediaType } from '../model/catalogItem'
import { catalogKeys } from './catalogKeys'
import { fetchAvailability, fetchAvailabilityRegions } from './availabilityClient'

export const AVAILABILITY_STALE_TIME_MS = 10 * 60 * 1000
export const AVAILABILITY_GC_TIME_MS = 30 * 60 * 1000
export const AVAILABILITY_REGIONS_STALE_TIME_MS = 24 * 60 * 60 * 1000
export const AVAILABILITY_REGIONS_GC_TIME_MS = 24 * 60 * 60 * 1000

interface QueryGate {
  readonly enabled?: boolean
}

export const useAvailabilityQuery = (
  mediaType: MediaType,
  itemId: string,
  region: string,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.availability(mediaType, itemId, region),
    queryFn: () => fetchAvailability({ mediaType, itemId, region }),
    staleTime: AVAILABILITY_STALE_TIME_MS,
    gcTime: AVAILABILITY_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })

export const useAvailabilityRegionsQuery = (options: QueryGate = {}) =>
  useQuery({
    queryKey: catalogKeys.availabilityRegions(),
    queryFn: fetchAvailabilityRegions,
    staleTime: AVAILABILITY_REGIONS_STALE_TIME_MS,
    gcTime: AVAILABILITY_REGIONS_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })
