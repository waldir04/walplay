import { useQueries } from '@tanstack/react-query'

import {
  CATALOG_GC_TIME_MS,
  CATALOG_STALE_TIME_MS,
  catalogKeys,
  fetchItem,
} from '@/entities/catalog'
import type { InterfaceLanguage } from '@/entities/catalog'
import { entryIdentity, isUsableSavedIdentity } from '@/entities/saved-library'
import type { SavedEntry } from '@/entities/saved-library'

import type { SavedEntryHydrationResult } from './savedEntryView'

export const useSavedEntriesHydration = (
  entries: readonly SavedEntry[],
  language: InterfaceLanguage
): readonly SavedEntryHydrationResult[] => {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: catalogKeys.item(entry.mediaType, entry.itemId, language),
      queryFn: () => fetchItem({ mediaType: entry.mediaType, itemId: entry.itemId, language }),
      staleTime: CATALOG_STALE_TIME_MS,
      gcTime: CATALOG_GC_TIME_MS,
      enabled: isUsableSavedIdentity(entry),
    })),
  })

  return results.map((result, index) => {
    const entry = entries[index]
    return {
      identity: entry === undefined ? '' : entryIdentity(entry),
      status: result.status,
      ...(result.data === undefined ? {} : { item: result.data.data }),
      ...(result.error === null || result.error === undefined ? {} : { error: result.error }),
      retry: () => {
        void result.refetch()
      },
    }
  })
}
