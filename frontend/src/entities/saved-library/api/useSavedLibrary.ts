import { useSyncExternalStore } from 'react'

import type { CollectionId } from '../model/constants'
import { hasIdentity } from '../model/savedEntry'
import type { SavedEntry, TitleIdentity } from '../model/savedEntry'
import { getSavedLibraryStore } from '../model/savedLibraryStore'
import type {
  SavedCollectionCounts,
  SavedLibrarySnapshot,
  SavedLibraryStatus,
  SavedLibraryStore,
} from '../model/savedLibraryStore'

export interface SavedLibraryState {
  readonly status: SavedLibraryStatus
  readonly watchlist: readonly SavedEntry[]
  readonly favorites: readonly SavedEntry[]
  readonly counts: SavedCollectionCounts
  readonly mutationError: SavedLibrarySnapshot['mutationError']
}

export const useSavedLibrary = (
  store: SavedLibraryStore = getSavedLibraryStore()
): SavedLibraryState => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return {
    status: snapshot.status,
    watchlist: snapshot.watchlist,
    favorites: snapshot.favorites,
    counts: snapshot.counts,
    mutationError: snapshot.mutationError,
  }
}

export interface SavedCollectionState {
  readonly status: SavedLibraryStatus
  readonly entries: readonly SavedEntry[]
  readonly count: number
  readonly isSaved: (identity: TitleIdentity) => boolean
  readonly isSavedIn: (collection: CollectionId, identity: TitleIdentity) => boolean
}

export const useSavedCollection = (
  collectionId: CollectionId,
  store: SavedLibraryStore = getSavedLibraryStore()
): SavedCollectionState => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const entries = snapshot[collectionId]

  return {
    status: snapshot.status,
    entries,
    count: snapshot.counts[collectionId],
    isSaved: (identity) => hasIdentity(entries, identity),
    isSavedIn: (collection, identity) => hasIdentity(snapshot[collection], identity),
  }
}
