import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { resolveInterfaceLanguage } from '@/entities/catalog'

import {
  getSavedLibraryStore,
  SAVED_BATCH_SIZE,
  useSavedCollection,
} from '@/entities/saved-library'
import type { CollectionId, SavedLibraryStore } from '@/entities/saved-library'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { SavedCollectionSection } from '@/widgets/saved-collection'
import type { SavedSectionStatus } from '@/widgets/saved-collection'

import { parseSavedCollectionPath } from '../model/parseSavedCollectionPath'
import { savedEntryView } from '../model/savedEntryView'
import { useSavedEntriesHydration } from '../model/useSavedEntriesHydration'

interface BatchState {
  readonly collection: CollectionId
  readonly count: number
}

const sectionStatus = (
  status: ReturnType<typeof useSavedCollection>['status']
): SavedSectionStatus => {
  switch (status) {
    case 'loading':
      return 'loading'
    case 'empty':
    case 'unavailable':
      return 'empty'
    case 'ready':
      return 'populated'
    case 'recovery-required':
      return 'recovery'
  }
}

export interface SavedPageProps {
  readonly store?: SavedLibraryStore
}

export const SavedPage = ({ store = getSavedLibraryStore() }: SavedPageProps = {}) => {
  const { i18n } = useTranslation()
  const location = useLocation()
  const collection = parseSavedCollectionPath(location.pathname) ?? 'watchlist'
  const library = useSavedCollection(collection, store)
  const [batch, setBatch] = useState<BatchState>({
    collection,
    count: SAVED_BATCH_SIZE,
  })
  const visibleCount = batch.collection === collection ? batch.count : SAVED_BATCH_SIZE

  useEffect(() => {
    document.getElementById(PAGE_HEADING_ID)?.focus()
  }, [collection])

  const previousCount = useRef(library.count)
  useEffect(() => {
    if (previousCount.current > 0 && library.count === 0) {
      document.getElementById(PAGE_HEADING_ID)?.focus()
    }
    previousCount.current = library.count
  }, [library.count])

  const entries = library.entries.slice(0, visibleCount)
  const language = resolveInterfaceLanguage(i18n.language)
  const hydration = useSavedEntriesHydration(entries, language)
  const views = entries.map((entry, index) => {
    const result = hydration[index]
    return result === undefined
      ? { entry, state: 'refreshing' as const }
      : savedEntryView(entry, result)
  })

  return (
    <SavedCollectionSection
      collection={collection}
      status={sectionStatus(library.status)}
      entries={entries}
      totalCount={library.count}
      visibleCount={visibleCount}
      onShowMore={() => {
        setBatch({
          collection,
          count: Math.min(visibleCount + SAVED_BATCH_SIZE, library.count),
        })
      }}
      views={views}
      store={store}
    />
  )
}
