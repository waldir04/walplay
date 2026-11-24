import { SAVED_LIBRARY_STORAGE_VERSION } from './constants'
import type { CollectionId } from './constants'
import {
  entryIdentity,
  hasIdentity,
  normalizeEntries,
  savedIdentity,
  storedEntryFromSnapshot,
} from './savedEntry'
import type { SavedEntry, SavedSnapshotInput, TitleIdentity } from './savedEntry'
import type { StoredLibraryEnvelope } from './savedLibrary'

export type AddOutcome = 'added' | 'already-present'
export type RemoveOutcome = 'removed' | 'already-absent'
export type ToggleOutcome = 'added' | 'removed'
export type ClearOutcome = 'cleared'

export interface LibraryOperationResult<Outcome> {
  readonly library: StoredLibraryEnvelope
  readonly outcome: Outcome
}

const replaceCollection = (
  library: StoredLibraryEnvelope,
  collection: CollectionId,
  entries: readonly SavedEntry[]
): StoredLibraryEnvelope => ({
  version: SAVED_LIBRARY_STORAGE_VERSION,
  watchlist: collection === 'watchlist' ? entries : library.watchlist,
  favorites: collection === 'favorites' ? entries : library.favorites,
})

export const addEntry = (
  library: StoredLibraryEnvelope,
  collection: CollectionId,
  snapshot: SavedSnapshotInput,
  savedAt: string
): LibraryOperationResult<AddOutcome> => {
  const identity = savedIdentity(snapshot.mediaType, snapshot.itemId)
  if (library[collection].some((entry) => entryIdentity(entry) === identity)) {
    return { library, outcome: 'already-present' }
  }

  const entry: SavedEntry = storedEntryFromSnapshot(snapshot, savedAt)
  const entries = normalizeEntries([...library[collection], entry])
  return { library: replaceCollection(library, collection, entries), outcome: 'added' }
}

export const removeEntry = (
  library: StoredLibraryEnvelope,
  collection: CollectionId,
  identity: TitleIdentity
): LibraryOperationResult<RemoveOutcome> => {
  const target = entryIdentity(identity)
  const entries = library[collection].filter((entry) => entryIdentity(entry) !== target)
  if (entries.length === library[collection].length) {
    return { library, outcome: 'already-absent' }
  }
  return { library: replaceCollection(library, collection, entries), outcome: 'removed' }
}

export const toggleEntry = (
  library: StoredLibraryEnvelope,
  collection: CollectionId,
  snapshot: SavedSnapshotInput,
  savedAt: string
): LibraryOperationResult<ToggleOutcome> => {
  if (hasIdentity(library[collection], snapshot)) {
    const removed = removeEntry(library, collection, snapshot)
    return { library: removed.library, outcome: 'removed' }
  }
  const added = addEntry(library, collection, snapshot, savedAt)
  return { library: added.library, outcome: 'added' }
}

export const clearCollection = (
  library: StoredLibraryEnvelope,
  collection: CollectionId
): LibraryOperationResult<ClearOutcome> => {
  if (library[collection].length === 0) {
    return { library, outcome: 'cleared' }
  }
  return { library: replaceCollection(library, collection, []), outcome: 'cleared' }
}

export const clearAll = (library: StoredLibraryEnvelope): LibraryOperationResult<ClearOutcome> => {
  if (library.watchlist.length === 0 && library.favorites.length === 0) {
    return { library, outcome: 'cleared' }
  }
  return { library: { ...library, watchlist: [], favorites: [] }, outcome: 'cleared' }
}
