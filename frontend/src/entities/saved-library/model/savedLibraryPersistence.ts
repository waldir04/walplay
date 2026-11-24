import { SAVED_LIBRARY_STORAGE_KEY } from './constants'
import { emptyLibrary, migrateLibrary } from './savedLibrary'
import type { StoredLibraryEnvelope } from './savedLibrary'

export type SavedStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type SavedRecoveryReason = 'corrupt' | 'unsupported-version'

export type LibraryReadOutcome =
  | { readonly kind: 'ready'; readonly library: StoredLibraryEnvelope }
  | { readonly kind: 'empty'; readonly library: StoredLibraryEnvelope }
  | {
      readonly kind: 'recovery-required'
      readonly reason: SavedRecoveryReason
      readonly version?: number
    }
  | { readonly kind: 'unavailable' }

export type LibraryWriteOutcome = 'written' | 'unavailable' | 'write-failed' | 'verification-failed'

export const serializeLibrary = (library: StoredLibraryEnvelope): string =>
  JSON.stringify({
    version: library.version,
    watchlist: library.watchlist,
    favorites: library.favorites,
  })

export const readLibrary = (storage: SavedStorage | null): LibraryReadOutcome => {
  if (storage === null) {
    return { kind: 'unavailable' }
  }

  let raw: string | null
  try {
    raw = storage.getItem(SAVED_LIBRARY_STORAGE_KEY)
  } catch {
    return { kind: 'unavailable' }
  }

  if (raw === null) {
    return { kind: 'empty', library: emptyLibrary() }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return { kind: 'recovery-required', reason: 'corrupt' }
  }

  const migrated = migrateLibrary(parsedJson)
  if (migrated.kind === 'corrupt') {
    return { kind: 'recovery-required', reason: 'corrupt' }
  }
  if (migrated.kind === 'unsupported-version') {
    return {
      kind: 'recovery-required',
      reason: 'unsupported-version',
      version: migrated.version,
    }
  }

  const { library } = migrated
  return library.watchlist.length === 0 && library.favorites.length === 0
    ? { kind: 'empty', library }
    : { kind: 'ready', library }
}

export const writeLibrary = (
  library: StoredLibraryEnvelope,
  storage: SavedStorage | null
): LibraryWriteOutcome => {
  if (storage === null) {
    return 'unavailable'
  }

  const serialized = serializeLibrary(library)
  try {
    storage.setItem(SAVED_LIBRARY_STORAGE_KEY, serialized)
  } catch {
    return 'write-failed'
  }

  try {
    if (storage.getItem(SAVED_LIBRARY_STORAGE_KEY) !== serialized) {
      return 'verification-failed'
    }
  } catch {
    return 'verification-failed'
  }

  return 'written'
}

export const resetLibrary = (storage: SavedStorage | null): LibraryWriteOutcome =>
  writeLibrary(emptyLibrary(), storage)
