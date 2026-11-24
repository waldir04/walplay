import { describe, expect, it, vi } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedSnapshot } from '@/test/fixtures/saved'

import { SAVED_LIBRARY_STORAGE_KEY } from './constants'
import { readLibrary, resetLibrary } from './savedLibraryPersistence'
import type { SavedStorage } from './savedLibraryPersistence'
import { createSavedLibraryStore } from './savedLibraryStore'

const createStorage = () => {
  let value: string | null = null
  const storage: SavedStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
  return { storage, raw: () => value }
}

const ALLOWED_ENVELOPE_KEYS = ['favorites', 'version', 'watchlist']
const ALLOWED_ENTRY_KEYS = [
  'itemId',
  'mediaType',
  'originalTitle',
  'poster',
  'releaseYear',
  'savedAt',
  'title',
]
const ALLOWED_POSTER_KEYS = ['url', 'urlLarge']

describe('saved library privacy regression', () => {
  it('never transmits stored data and writes only allowed fields', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const harness = createStorage()
    const store = createSavedLibraryStore({ storage: harness.storage, now: () => SAVED_AT })
    store.subscribe(() => undefined)
    await Promise.resolve()

    readLibrary(harness.storage)
    store.add('watchlist', savedSnapshot())
    store.toggle('favorites', savedSnapshot())
    store.remove('watchlist', { mediaType: 'movie', itemId: MOVIE_ID })
    store.add('watchlist', savedSnapshot())

    const written = JSON.parse(harness.raw() ?? '{}') as Record<string, unknown>
    expect(Object.keys(written).sort()).toEqual(ALLOWED_ENVELOPE_KEYS)
    const watchlist = written.watchlist as Record<string, unknown>[]
    expect(watchlist).toHaveLength(1)
    expect(Object.keys(watchlist[0] ?? {}).sort()).toEqual(ALLOWED_ENTRY_KEYS)
    const poster = (watchlist[0]?.poster ?? {}) as Record<string, unknown>
    expect(Object.keys(poster).sort()).toEqual(ALLOWED_POSTER_KEYS)

    const serialized = JSON.stringify(written)
    expect(serialized).not.toMatch(/token|account|email|profile|watched|rating|note|availability/i)

    store.clearCollection('watchlist')
    store.clearAll()
    store.resetUnreadable()
    resetLibrary(harness.storage)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(SAVED_LIBRARY_STORAGE_KEY).toBe('walplay.saved-library.v1')
  })
})
