import { useInfiniteQuery } from '@tanstack/react-query'

import type { InterfaceLanguage } from '../model/catalogLanguage'
import type { SearchQuery } from '../model/searchQuery'
import { fetchSearchPage } from './catalogClient'
import type { SearchPageBody } from './catalogClient'
import { catalogKeys } from './catalogKeys'
import { CATALOG_GC_TIME_MS, CATALOG_STALE_TIME_MS } from './catalogQueries'

export const resolveNextSearchPage = (lastPage: SearchPageBody): number | undefined =>
  lastPage.data.hasMore ? lastPage.data.page + 1 : undefined

export const useSearchQuery = (query: SearchQuery, language: InterfaceLanguage) =>
  useInfiniteQuery({
    queryKey: catalogKeys.search(query.identity, language),
    queryFn: ({ pageParam }) =>
      fetchSearchPage({ query: query.trimmed, language, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: resolveNextSearchPage,
    enabled: query.validity === 'valid',
    retry: false,
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
