import { useQuery } from '@tanstack/react-query'

import type { MediaType } from '../model/catalogItem'
import { catalogKeys } from './catalogKeys'
import { fetchTrailers } from './trailerClient'

export const TRAILER_STALE_TIME_MS = 24 * 60 * 60 * 1000
export const TRAILER_GC_TIME_MS = 7 * 24 * 60 * 60 * 1000

interface QueryGate {
  readonly enabled?: boolean
}

export const useTrailerQuery = (mediaType: MediaType, itemId: string, options: QueryGate = {}) =>
  useQuery({
    queryKey: catalogKeys.trailers(mediaType, itemId),
    queryFn: () => fetchTrailers({ mediaType, itemId }),
    staleTime: TRAILER_STALE_TIME_MS,
    gcTime: TRAILER_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })
