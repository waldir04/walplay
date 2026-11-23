import { useQuery } from '@tanstack/react-query'

import type { MediaType } from '../model/catalogItem'
import type { InterfaceLanguage } from '../model/catalogLanguage'
import { catalogKeys } from './catalogKeys'
import {
  fetchCollection,
  fetchCredits,
  fetchDetail,
  fetchSeason,
  fetchSimilar,
} from './detailClient'

export const DETAIL_STALE_TIME_MS = 5 * 60 * 1000
export const DETAIL_GC_TIME_MS = 30 * 60 * 1000
export const DETAIL_SECTION_STALE_TIME_MS = 10 * 60 * 1000

interface QueryGate {
  readonly enabled?: boolean
}

export const useDetailQuery = (
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.detail(mediaType, itemId, language),
    queryFn: () => fetchDetail({ mediaType, itemId, language }),
    staleTime: DETAIL_STALE_TIME_MS,
    gcTime: DETAIL_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })

export const useCreditsQuery = (
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.credits(mediaType, itemId, language),
    queryFn: () => fetchCredits({ mediaType, itemId, language }),
    staleTime: DETAIL_SECTION_STALE_TIME_MS,
    gcTime: DETAIL_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })

export const useSimilarQuery = (
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.similar(mediaType, itemId, language),
    queryFn: () => fetchSimilar({ mediaType, itemId, language }),
    staleTime: DETAIL_SECTION_STALE_TIME_MS,
    gcTime: DETAIL_GC_TIME_MS,
    retry: false,
    enabled: options.enabled ?? true,
  })

export const useCollectionQuery = (
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.collection(mediaType, itemId, language),
    queryFn: () => fetchCollection({ mediaType, itemId, language }),
    staleTime: DETAIL_SECTION_STALE_TIME_MS,
    gcTime: DETAIL_GC_TIME_MS,
    retry: false,
    enabled: (options.enabled ?? true) && mediaType === 'movie',
  })

export const useSeasonQuery = (
  mediaType: MediaType,
  itemId: string,
  seasonNumber: number | undefined,
  language: InterfaceLanguage,
  options: QueryGate = {}
) =>
  useQuery({
    queryKey: catalogKeys.season(mediaType, itemId, seasonNumber ?? -1, language),
    queryFn: () => {
      if (seasonNumber === undefined) {
        throw new Error('Season number is required.')
      }
      return fetchSeason({ mediaType, itemId, language, seasonNumber })
    },
    staleTime: DETAIL_SECTION_STALE_TIME_MS,
    gcTime: DETAIL_GC_TIME_MS,
    retry: false,
    enabled: (options.enabled ?? true) && mediaType === 'tv' && seasonNumber !== undefined,
  })
