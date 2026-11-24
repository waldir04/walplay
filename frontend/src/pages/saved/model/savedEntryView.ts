import { stateForError } from '@/entities/catalog'
import type { CatalogItem } from '@/entities/catalog'
import { isUsableSavedIdentity } from '@/entities/saved-library'
import type { SavedEntry } from '@/entities/saved-library'
import type { SavedEntryView } from '@/widgets/saved-collection'

export type { SavedEntryView, SavedEntryViewState } from '@/widgets/saved-collection'

export interface SavedEntryHydrationResult {
  readonly identity: string
  readonly status: 'pending' | 'success' | 'error'
  readonly item?: CatalogItem
  readonly error?: unknown
  readonly retry: () => void
}

export const savedEntryView = (
  entry: SavedEntry,
  hydration: SavedEntryHydrationResult
): SavedEntryView => {
  if (!isUsableSavedIdentity(entry)) {
    return { entry, state: 'unreadable' }
  }

  if (hydration.status === 'success' && hydration.item !== undefined) {
    return { entry, state: 'hydrated', item: hydration.item }
  }

  if (hydration.status === 'error') {
    if (stateForError(hydration.error) === 'not-found') {
      return { entry, state: 'not-in-catalog' }
    }
    return { entry, state: 'temporarily-unavailable', retry: hydration.retry }
  }

  return { entry, state: 'refreshing' }
}
