import type { SavedEntry, SavedSnapshotInput } from '@/entities/saved-library'
import type { StoredLibraryEnvelope } from '@/entities/saved-library'

import { MOVIE_ID, TV_ID } from '../catalog'

export const SAVED_AT = '2026-11-24T15:30:00.000Z'

export const savedEntry = (overrides: Partial<SavedEntry> = {}): SavedEntry => ({
  mediaType: 'movie',
  itemId: MOVIE_ID,
  title: 'Fight Club',
  originalTitle: 'Fight Club',
  releaseYear: 1999,
  poster: {
    url: 'https://image.example.test/w342/fight-club.jpg',
    urlLarge: 'https://image.example.test/w780/fight-club.jpg',
  },
  savedAt: SAVED_AT,
  ...overrides,
})

export const savedSnapshot = (overrides: Partial<SavedSnapshotInput> = {}): SavedSnapshotInput => ({
  mediaType: 'movie',
  itemId: MOVIE_ID,
  title: 'Fight Club',
  originalTitle: 'Fight Club',
  releaseYear: 1999,
  poster: {
    url: 'https://image.example.test/w342/fight-club.jpg',
    urlLarge: 'https://image.example.test/w780/fight-club.jpg',
  },
  ...overrides,
})

export const savedEnvelope = (
  overrides: Partial<StoredLibraryEnvelope> = {}
): StoredLibraryEnvelope => ({
  version: 1,
  watchlist: [],
  favorites: [],
  ...overrides,
})

export const savedTvEntry = (overrides: Partial<SavedEntry> = {}): SavedEntry =>
  savedEntry({
    mediaType: 'tv',
    itemId: TV_ID,
    title: 'Example Show',
    originalTitle: undefined,
    releaseYear: 2011,
    poster: undefined,
    ...overrides,
  })
