import { SAVED_COLLECTION_PATHS } from '@/entities/saved-library'
import type { CollectionId } from '@/entities/saved-library'

export const parseSavedCollectionPath = (pathname: string): CollectionId | null => {
  if (pathname === SAVED_COLLECTION_PATHS.watchlist) {
    return 'watchlist'
  }
  if (pathname === SAVED_COLLECTION_PATHS.favorites) {
    return 'favorites'
  }
  return null
}
