import { z } from 'zod'

import { SAVED_ITEM_ID_PATTERN, SAVED_TIME_SENTINEL } from './constants'

export type { CollectionId } from './constants'

export const savedMediaTypeSchema = z.enum(['movie', 'tv'])
export type SavedMediaType = z.infer<typeof savedMediaTypeSchema>

export const savedPosterSchema = z.object({
  url: z.url(),
  urlLarge: z.url().optional(),
})
export type SavedPoster = z.infer<typeof savedPosterSchema>

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/

export const isSavedTimestamp = (value: string): boolean =>
  ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value))

const savedAtSchema = z.preprocess(
  (value) => (typeof value === 'string' && isSavedTimestamp(value) ? value : SAVED_TIME_SENTINEL),
  z.string()
)

/**
 * Structural shape of a stored entry. Identity usability is checked separately
 * by `isUsableSavedIdentity`: an entry whose id does not match the catalog
 * pattern is still a valid stored record so the visitor can see and remove it.
 */
export const savedEntrySchema = z.object({
  mediaType: savedMediaTypeSchema,
  itemId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  originalTitle: z.string().trim().min(1).optional().catch(undefined),
  releaseYear: z.number().int().min(1800).max(2100).optional().catch(undefined),
  poster: savedPosterSchema.optional().catch(undefined),
  savedAt: savedAtSchema,
})

export type SavedEntry = z.infer<typeof savedEntrySchema>
export type SavedSnapshotInput = Omit<SavedEntry, 'savedAt'>

export interface TitleIdentity {
  readonly mediaType: SavedMediaType
  readonly itemId: string
}

export const savedIdentity = (mediaType: SavedMediaType, itemId: string): string =>
  `${mediaType}:${itemId}`

export const entryIdentity = (entry: TitleIdentity): string =>
  savedIdentity(entry.mediaType, entry.itemId)

export const isUsableSavedIdentity = (identity: Pick<TitleIdentity, 'itemId'>): boolean =>
  SAVED_ITEM_ID_PATTERN.test(identity.itemId)

export const compareEntries = (left: SavedEntry, right: SavedEntry): number => {
  const bySavedAt = Date.parse(right.savedAt) - Date.parse(left.savedAt)
  if (bySavedAt !== 0) {
    return bySavedAt
  }
  const leftIdentity = entryIdentity(left)
  const rightIdentity = entryIdentity(right)
  if (leftIdentity === rightIdentity) {
    return 0
  }
  return leftIdentity < rightIdentity ? -1 : 1
}

export const dedupeEntries = (entries: readonly SavedEntry[]): SavedEntry[] => {
  const byIdentity = new Map<string, SavedEntry>()
  for (const entry of entries) {
    const key = entryIdentity(entry)
    const existing = byIdentity.get(key)
    if (existing === undefined || Date.parse(entry.savedAt) > Date.parse(existing.savedAt)) {
      byIdentity.set(key, entry)
    }
  }
  return [...byIdentity.values()]
}

export const normalizeEntries = (entries: readonly SavedEntry[]): SavedEntry[] =>
  [...dedupeEntries(entries)].sort(compareEntries)

export const hasIdentity = (entries: readonly SavedEntry[], identity: TitleIdentity): boolean =>
  entries.some((entry) => entryIdentity(entry) === entryIdentity(identity))

export const storedEntryFromSnapshot = (
  snapshot: SavedSnapshotInput,
  savedAt: string
): SavedEntry => ({
  mediaType: snapshot.mediaType,
  itemId: snapshot.itemId,
  title: snapshot.title,
  ...(snapshot.originalTitle === undefined ? {} : { originalTitle: snapshot.originalTitle }),
  ...(snapshot.releaseYear === undefined ? {} : { releaseYear: snapshot.releaseYear }),
  ...(snapshot.poster === undefined
    ? {}
    : {
        poster: {
          url: snapshot.poster.url,
          ...(snapshot.poster.urlLarge === undefined ? {} : { urlLarge: snapshot.poster.urlLarge }),
        },
      }),
  savedAt,
})

export const snapshotFromEntry = (entry: SavedEntry): SavedSnapshotInput => ({
  mediaType: entry.mediaType,
  itemId: entry.itemId,
  title: entry.title,
  ...(entry.originalTitle === undefined ? {} : { originalTitle: entry.originalTitle }),
  ...(entry.releaseYear === undefined ? {} : { releaseYear: entry.releaseYear }),
  ...(entry.poster === undefined ? {} : { poster: entry.poster }),
})
