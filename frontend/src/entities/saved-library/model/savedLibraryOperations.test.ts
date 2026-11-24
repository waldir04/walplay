import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEnvelope, savedSnapshot } from '@/test/fixtures/saved'

import {
  addEntry,
  clearAll,
  clearCollection,
  removeEntry,
  toggleEntry,
} from './savedLibraryOperations'

const identity = { mediaType: 'movie' as const, itemId: MOVIE_ID }

describe('saved library operations', () => {
  it('adds a snapshot and assigns the provided timestamp', () => {
    const result = addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)

    expect(result.outcome).toBe('added')
    expect(result.library.watchlist).toHaveLength(1)
    expect(result.library.watchlist[0]?.savedAt).toBe(SAVED_AT)
    expect(result.library.favorites).toHaveLength(0)
  })

  it('reports a duplicate add without duplicating the entry', () => {
    const first = addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)
    const second = addEntry(first.library, 'watchlist', savedSnapshot(), SAVED_AT)

    expect(second.outcome).toBe('already-present')
    expect(second.library.watchlist).toHaveLength(1)
  })

  it('removes an existing entry', () => {
    const added = addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)
    const removed = removeEntry(added.library, 'watchlist', identity)

    expect(removed.outcome).toBe('removed')
    expect(removed.library.watchlist).toHaveLength(0)
  })

  it('treats removing an absent entry as a successful no-op', () => {
    const library = savedEnvelope()
    const result = removeEntry(library, 'watchlist', identity)

    expect(result.outcome).toBe('already-absent')
    expect(result.library).toBe(library)
  })

  it('toggles in both directions', () => {
    const added = toggleEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)
    expect(added.outcome).toBe('added')
    expect(added.library.watchlist).toHaveLength(1)

    const removed = toggleEntry(added.library, 'watchlist', savedSnapshot(), SAVED_AT)
    expect(removed.outcome).toBe('removed')
    expect(removed.library.watchlist).toHaveLength(0)
  })

  it('keeps collections independent', () => {
    const inWatchlist = addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)
    const inBoth = addEntry(inWatchlist.library, 'favorites', savedSnapshot(), SAVED_AT)

    expect(inBoth.library.watchlist).toHaveLength(1)
    expect(inBoth.library.favorites).toHaveLength(1)

    const removedFromFavorites = removeEntry(inBoth.library, 'favorites', identity)
    expect(removedFromFavorites.library.watchlist).toHaveLength(1)
    expect(removedFromFavorites.library.favorites).toHaveLength(0)
  })

  it('clears one collection without touching the other', () => {
    const inBoth = addEntry(
      addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT).library,
      'favorites',
      savedSnapshot(),
      SAVED_AT
    ).library

    const cleared = clearCollection(inBoth, 'watchlist')
    expect(cleared.outcome).toBe('cleared')
    expect(cleared.library.watchlist).toHaveLength(0)
    expect(cleared.library.favorites).toHaveLength(1)
  })

  it('clears all collections', () => {
    const inBoth = addEntry(
      addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT).library,
      'favorites',
      savedSnapshot(),
      SAVED_AT
    ).library

    const cleared = clearAll(inBoth)
    expect(cleared.library.watchlist).toHaveLength(0)
    expect(cleared.library.favorites).toHaveLength(0)
  })

  it('never mutates the input envelope', () => {
    const library = savedEnvelope()
    const before = JSON.parse(JSON.stringify(library)) as unknown

    addEntry(library, 'watchlist', savedSnapshot(), SAVED_AT)
    removeEntry(library, 'watchlist', identity)
    toggleEntry(library, 'watchlist', savedSnapshot(), SAVED_AT)
    clearCollection(library, 'watchlist')
    clearAll(library)

    expect(library).toEqual(before)
  })

  it('is idempotent when replayed', () => {
    const first = addEntry(savedEnvelope(), 'watchlist', savedSnapshot(), SAVED_AT)
    const replayed = addEntry(first.library, 'watchlist', savedSnapshot(), SAVED_AT)

    expect(replayed.outcome).toBe('already-present')
    expect(replayed.library.watchlist).toEqual(first.library.watchlist)
  })
})
