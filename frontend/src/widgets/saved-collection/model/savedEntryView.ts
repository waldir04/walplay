import type { CatalogItem } from '@/entities/catalog'
import type { SavedEntry } from '@/entities/saved-library'

export type SavedEntryViewState =
  'hydrated' | 'refreshing' | 'temporarily-unavailable' | 'not-in-catalog' | 'unreadable'

export interface SavedEntryView {
  readonly entry: SavedEntry
  readonly state: SavedEntryViewState
  readonly item?: CatalogItem
  readonly retry?: () => void
}
