import { SAVED_LIBRARY_STORAGE_KEY } from './constants'
import type { CollectionId } from './constants'
import {
  addEntry,
  clearAll as clearAllEntries,
  clearCollection as clearCollectionEntries,
  removeEntry,
  toggleEntry,
} from './savedLibraryOperations'
import { emptyLibrary } from './savedLibrary'
import type { StoredLibraryEnvelope } from './savedLibrary'
import { readLibrary, resetLibrary, writeLibrary } from './savedLibraryPersistence'
import type { LibraryReadOutcome, SavedStorage } from './savedLibraryPersistence'
import type { SavedEntry, SavedSnapshotInput, TitleIdentity } from './savedEntry'

export type SavedLibraryStatus = 'loading' | 'ready' | 'empty' | 'recovery-required' | 'unavailable'

export type SavedMutationOutcome =
  | 'added'
  | 'already-present'
  | 'removed'
  | 'already-absent'
  | 'cleared'
  | 'reset'
  | 'unavailable'
  | 'write-failed'

export interface SavedCollectionCounts {
  readonly watchlist: number
  readonly favorites: number
}

export interface SavedLibrarySnapshot {
  readonly status: SavedLibraryStatus
  readonly watchlist: readonly SavedEntry[]
  readonly favorites: readonly SavedEntry[]
  readonly counts: SavedCollectionCounts
  readonly mutationError: 'unavailable' | 'write-failed' | null
  readonly recoveryReason: 'corrupt' | 'unsupported-version' | null
}

export interface SavedMutationResult {
  readonly outcome: SavedMutationOutcome
}

export interface SavedStorageEvent {
  readonly key: string | null
}

export interface SavedEventTarget {
  readonly addEventListener: (type: 'storage', listener: (event: SavedStorageEvent) => void) => void
  readonly removeEventListener: (
    type: 'storage',
    listener: (event: SavedStorageEvent) => void
  ) => void
}

export interface SavedLibraryStoreOptions {
  readonly storage: SavedStorage | null
  readonly eventTarget?: SavedEventTarget | null
  readonly now?: () => string
}

export interface SavedLibraryStore {
  readonly getSnapshot: () => SavedLibrarySnapshot
  readonly subscribe: (listener: () => void) => () => void
  readonly add: (collection: CollectionId, snapshot: SavedSnapshotInput) => SavedMutationResult
  readonly remove: (collection: CollectionId, identity: TitleIdentity) => SavedMutationResult
  readonly toggle: (collection: CollectionId, snapshot: SavedSnapshotInput) => SavedMutationResult
  readonly clearCollection: (collection: CollectionId) => SavedMutationResult
  readonly clearAll: () => SavedMutationResult
  readonly resetUnreadable: () => SavedMutationResult
  readonly reload: () => void
  readonly dispose: () => void
}

const buildSnapshot = (
  status: SavedLibraryStatus,
  library: StoredLibraryEnvelope,
  mutationError: SavedLibrarySnapshot['mutationError'],
  recoveryReason: SavedLibrarySnapshot['recoveryReason']
): SavedLibrarySnapshot =>
  Object.freeze({
    status,
    watchlist: Object.freeze(library.watchlist),
    favorites: Object.freeze(library.favorites),
    counts: Object.freeze({
      watchlist: library.watchlist.length,
      favorites: library.favorites.length,
    }),
    mutationError,
    recoveryReason,
  })

const statusFor = (library: StoredLibraryEnvelope): SavedLibraryStatus =>
  library.watchlist.length === 0 && library.favorites.length === 0 ? 'empty' : 'ready'

export const createSavedLibraryStore = ({
  storage,
  eventTarget = null,
  now = () => new Date().toISOString(),
}: SavedLibraryStoreOptions): SavedLibraryStore => {
  const listeners = new Set<() => void>()
  let loaded = false
  let library = emptyLibrary()
  let snapshot = buildSnapshot('loading', library, null, null)

  const notify = (): void => {
    listeners.forEach((listener) => listener())
  }

  const setSnapshot = (
    nextStatus: SavedLibraryStatus,
    nextLibrary: StoredLibraryEnvelope,
    mutationError: SavedLibrarySnapshot['mutationError'],
    recoveryReason: SavedLibrarySnapshot['recoveryReason'] = null
  ): void => {
    library = nextLibrary
    snapshot = buildSnapshot(nextStatus, nextLibrary, mutationError, recoveryReason)
  }

  const applyRead = (outcome: LibraryReadOutcome): void => {
    switch (outcome.kind) {
      case 'ready':
        setSnapshot('ready', outcome.library, null)
        return
      case 'empty':
        setSnapshot('empty', outcome.library, null)
        return
      case 'unavailable':
        setSnapshot('unavailable', library, null)
        return
      case 'recovery-required':
        setSnapshot('recovery-required', emptyLibrary(), null, outcome.reason)
    }
  }

  const load = (): void => {
    if (loaded) {
      return
    }
    loaded = true
    applyRead(readLibrary(storage))
  }

  const reload = (): void => {
    loaded = true
    applyRead(readLibrary(storage))
    notify()
  }

  const handleStorage = (event: SavedStorageEvent): void => {
    if (event.key !== null && event.key !== SAVED_LIBRARY_STORAGE_KEY) {
      return
    }
    reload()
  }

  eventTarget?.addEventListener('storage', handleStorage)

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    if (!loaded) {
      queueMicrotask(() => {
        if (loaded) {
          return
        }
        load()
        notify()
      })
    }
    return () => {
      listeners.delete(listener)
    }
  }

  const persist = (
    operation: (base: StoredLibraryEnvelope) => {
      readonly library: StoredLibraryEnvelope
      readonly outcome: SavedMutationOutcome
    }
  ): SavedMutationResult => {
    if (!loaded) {
      load()
    }

    if (storage === null || snapshot.status === 'unavailable') {
      const result = operation(library)
      setSnapshot(statusFor(result.library), result.library, 'unavailable')
      notify()
      return { outcome: 'unavailable' }
    }

    if (snapshot.status === 'recovery-required') {
      return { outcome: 'write-failed' }
    }

    const latest = readLibrary(storage)
    if (latest.kind === 'recovery-required') {
      setSnapshot('recovery-required', emptyLibrary(), null, latest.reason)
      return { outcome: 'write-failed' }
    }
    if (latest.kind === 'unavailable') {
      const result = operation(library)
      setSnapshot(statusFor(result.library), result.library, 'unavailable')
      notify()
      return { outcome: 'unavailable' }
    }

    const result = operation(latest.library)
    const isNoOp = result.outcome === 'already-present' || result.outcome === 'already-absent'
    if (isNoOp) {
      setSnapshot(statusFor(result.library), result.library, null)
      notify()
      return { outcome: result.outcome }
    }

    const write = writeLibrary(result.library, storage)
    if (write !== 'written') {
      return { outcome: write === 'unavailable' ? 'unavailable' : 'write-failed' }
    }

    setSnapshot(statusFor(result.library), result.library, null)
    notify()
    return { outcome: result.outcome }
  }

  const add = (collection: CollectionId, savedSnapshot: SavedSnapshotInput): SavedMutationResult =>
    persist((base) => {
      const result = addEntry(base, collection, savedSnapshot, now())
      return { library: result.library, outcome: result.outcome }
    })

  const remove = (collection: CollectionId, identity: TitleIdentity): SavedMutationResult =>
    persist((base) => {
      const result = removeEntry(base, collection, identity)
      return { library: result.library, outcome: result.outcome }
    })

  const toggle = (
    collection: CollectionId,
    savedSnapshot: SavedSnapshotInput
  ): SavedMutationResult =>
    persist((base) => {
      const result = toggleEntry(base, collection, savedSnapshot, now())
      return { library: result.library, outcome: result.outcome }
    })

  const clearCollection = (collection: CollectionId): SavedMutationResult =>
    persist((base) => {
      const result = clearCollectionEntries(base, collection)
      return { library: result.library, outcome: result.outcome }
    })

  const clearAll = (): SavedMutationResult =>
    persist((base) => {
      const result = clearAllEntries(base)
      return { library: result.library, outcome: result.outcome }
    })

  const resetUnreadable = (): SavedMutationResult => {
    if (!loaded) {
      load()
    }

    if (storage === null) {
      setSnapshot('empty', emptyLibrary(), 'unavailable')
      notify()
      return { outcome: 'unavailable' }
    }

    const write = resetLibrary(storage)
    if (write !== 'written') {
      return { outcome: write === 'unavailable' ? 'unavailable' : 'write-failed' }
    }

    setSnapshot('empty', emptyLibrary(), null)
    notify()
    return { outcome: 'reset' }
  }

  const dispose = (): void => {
    eventTarget?.removeEventListener('storage', handleStorage)
    listeners.clear()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe,
    add,
    remove,
    toggle,
    clearCollection,
    clearAll,
    resetUnreadable,
    reload,
    dispose,
  }
}

const resolveBrowserStorage = (): SavedStorage | null => {
  try {
    if (typeof window === 'undefined' || window.localStorage === undefined) {
      return null
    }
    return window.localStorage
  } catch {
    return null
  }
}

const resolveBrowserEventTarget = (): SavedEventTarget | null => {
  try {
    if (typeof window === 'undefined') {
      return null
    }
    return window as unknown as SavedEventTarget
  } catch {
    return null
  }
}

let defaultStore: SavedLibraryStore | null = null

export const getSavedLibraryStore = (): SavedLibraryStore => {
  if (defaultStore === null) {
    defaultStore = createSavedLibraryStore({
      storage: resolveBrowserStorage(),
      eventTarget: resolveBrowserEventTarget(),
    })
  }
  return defaultStore
}
