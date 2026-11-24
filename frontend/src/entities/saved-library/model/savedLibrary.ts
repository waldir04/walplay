import { z } from 'zod'

import { SAVED_LIBRARY_STORAGE_VERSION } from './constants'
import { normalizeEntries, savedEntrySchema } from './savedEntry'
import type { SavedEntry } from './savedEntry'

export interface StoredLibraryEnvelope {
  readonly version: typeof SAVED_LIBRARY_STORAGE_VERSION
  readonly watchlist: readonly SavedEntry[]
  readonly favorites: readonly SavedEntry[]
}

export const emptyLibrary = (): StoredLibraryEnvelope => ({
  version: SAVED_LIBRARY_STORAGE_VERSION,
  watchlist: [],
  favorites: [],
})

export const savedLibraryEnvelopeSchema = z.object({
  version: z.literal(SAVED_LIBRARY_STORAGE_VERSION),
  watchlist: z.array(savedEntrySchema),
  favorites: z.array(savedEntrySchema),
})

export type LibraryMigrationResult =
  | { readonly kind: 'ok'; readonly library: StoredLibraryEnvelope }
  | { readonly kind: 'unsupported-version'; readonly version: number }
  | { readonly kind: 'corrupt' }

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const parseCollection = (value: unknown): SavedEntry[] | null => {
  if (!Array.isArray(value)) {
    return null
  }
  const entries: SavedEntry[] = []
  for (const candidate of value) {
    const parsed = savedEntrySchema.safeParse(candidate)
    if (parsed.success) {
      entries.push(parsed.data)
    }
  }
  return normalizeEntries(entries)
}

/**
 * Validates an untrusted stored envelope. Structurally invalid entries are
 * dropped individually; an unsupported version is reported and preserved by
 * the persistence layer instead of being rewritten.
 */
export const migrateLibrary = (raw: unknown): LibraryMigrationResult => {
  const record = asRecord(raw)
  if (record === null) {
    return { kind: 'corrupt' }
  }

  const version = record.version
  if (typeof version !== 'number') {
    return { kind: 'corrupt' }
  }
  if (version !== SAVED_LIBRARY_STORAGE_VERSION) {
    return { kind: 'unsupported-version', version }
  }

  const watchlist = parseCollection(record.watchlist)
  const favorites = parseCollection(record.favorites)
  if (watchlist === null || favorites === null) {
    return { kind: 'corrupt' }
  }

  const library: StoredLibraryEnvelope = {
    version: SAVED_LIBRARY_STORAGE_VERSION,
    watchlist,
    favorites,
  }

  return savedLibraryEnvelopeSchema.safeParse(library).success
    ? { kind: 'ok', library }
    : { kind: 'corrupt' }
}
