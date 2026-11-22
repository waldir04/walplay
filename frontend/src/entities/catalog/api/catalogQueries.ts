import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { MediaType } from '../model/catalogItem'
import type { InterfaceLanguage } from '../model/catalogLanguage'
import type { SectionId } from '../model/catalogSection'
import { catalogKeys } from './catalogKeys'
import { fetchCapabilities, fetchItem, fetchSectionPage } from './catalogClient'
import type { SectionPageBody } from './catalogClient'

export const CATALOG_STALE_TIME_MS = 5 * 60 * 1000
export const CATALOG_GC_TIME_MS = 30 * 60 * 1000

export const useCapabilitiesQuery = () =>
  useQuery({
    queryKey: catalogKeys.capabilities(),
    queryFn: fetchCapabilities,
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
  })

export const useSectionPreviewQuery = (
  mediaType: MediaType,
  section: SectionId,
  language: InterfaceLanguage
) =>
  useQuery({
    queryKey: catalogKeys.section(mediaType, section, language, 1),
    queryFn: () => fetchSectionPage({ mediaType, section, language, page: 1 }),
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
  })

export const useCatalogItemQuery = (
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  options: { readonly enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: catalogKeys.item(mediaType, itemId, language),
    queryFn: () => fetchItem({ mediaType, itemId, language }),
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
    enabled: options.enabled ?? true,
  })

const resolveNextPage = (lastPage: SectionPageBody): number | undefined => {
  const { hasMore, page } = lastPage.data
  if (!hasMore) {
    return undefined
  }
  return page + 1
}

export const useCategoryQuery = (
  mediaType: MediaType,
  section: SectionId,
  language: InterfaceLanguage
) =>
  useInfiniteQuery({
    queryKey: catalogKeys.category(mediaType, section, language),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchSectionPage({
        mediaType,
        section,
        language,
        page: pageParam,
      }),
    getNextPageParam: resolveNextPage,
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
  })

export const flattenCatalogPages = (
  pages: readonly SectionPageBody[]
): { readonly items: SectionPageBody['data']['items']; readonly duplicates: number } => {
  const seen = new Set<string>()
  const items: SectionPageBody['data']['items'][number][] = []
  let duplicates = 0

  for (const page of pages) {
    for (const item of page.data.items) {
      if (seen.has(item.id)) {
        duplicates += 1
        continue
      }
      seen.add(item.id)
      items.push(item)
    }
  }

  return { items, duplicates }
}
