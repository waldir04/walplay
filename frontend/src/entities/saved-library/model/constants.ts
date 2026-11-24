export const SAVED_LIBRARY_STORAGE_KEY = 'walplay.saved-library.v1'
export const SAVED_LIBRARY_STORAGE_VERSION = 1
export const SAVED_BATCH_SIZE = 50
export const SAVED_ROUTE_PREFIX = '/saved'
export const SAVED_TIME_SENTINEL = '1970-01-01T00:00:00.000Z'

/**
 * Mirrors the catalog's opaque item id rule. The saved-library entity owns its
 * copy so it never imports another entity slice and can validate untrusted
 * stored data on its own.
 */
export const SAVED_ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export type CollectionId = 'watchlist' | 'favorites'

export const SAVED_COLLECTIONS = Object.freeze(['watchlist', 'favorites'] as const)

export const SAVED_COLLECTION_PATHS: Readonly<Record<CollectionId, string>> = Object.freeze({
  watchlist: `${SAVED_ROUTE_PREFIX}/watchlist`,
  favorites: `${SAVED_ROUTE_PREFIX}/favorites`,
})
