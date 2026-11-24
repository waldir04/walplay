import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'
import { savedEnvelope, savedEntry } from '@/test/fixtures/saved'

import { SAVED_LIBRARY_STORAGE_KEY, SAVED_TIME_SENTINEL } from './constants'
import { readLibrary, resetLibrary, writeLibrary } from './savedLibraryPersistence'
import type { SavedStorage } from './savedLibraryPersistence'

interface FakeStorageOptions {
  readonly raw?: string | null
  readonly throwOnGet?: boolean
  readonly throwOnSet?: boolean
  readonly storeAs?: string
}

const createFakeStorage = (options: FakeStorageOptions = {}): SavedStorage => {
  let value = options.raw ?? null
  return {
    getItem: (key) => {
      if (options.throwOnGet) {
        throw new Error('storage read blocked')
      }
      return key === SAVED_LIBRARY_STORAGE_KEY ? value : null
    },
    setItem: (key, next) => {
      if (options.throwOnSet) {
        throw new Error('quota exceeded')
      }
      if (key === SAVED_LIBRARY_STORAGE_KEY) {
        value = options.storeAs ?? next
      }
    },
    removeItem: (key) => {
      if (key === SAVED_LIBRARY_STORAGE_KEY) {
        value = null
      }
    },
  }
}

const currentRaw = (storage: SavedStorage): string | null =>
  storage.getItem(SAVED_LIBRARY_STORAGE_KEY)

describe('readLibrary', () => {
  it('returns empty for an absent key', () => {
    expect(readLibrary(createFakeStorage())).toEqual({ kind: 'empty', library: savedEnvelope() })
  })

  it('returns empty for an empty envelope', () => {
    expect(readLibrary(createFakeStorage({ raw: JSON.stringify(savedEnvelope()) }))).toEqual({
      kind: 'empty',
      library: savedEnvelope(),
    })
  })

  it('returns ready for a valid populated envelope', () => {
    const library = savedEnvelope({ watchlist: [savedEntry()] })
    expect(readLibrary(createFakeStorage({ raw: JSON.stringify(library) }))).toEqual({
      kind: 'ready',
      library,
    })
  })

  it('requires recovery for unparseable JSON', () => {
    expect(readLibrary(createFakeStorage({ raw: '{not json' }))).toEqual({
      kind: 'recovery-required',
      reason: 'corrupt',
    })
  })

  it('requires recovery for a schema-invalid envelope', () => {
    expect(
      readLibrary(createFakeStorage({ raw: JSON.stringify({ version: 1, watchlist: 'nope' }) }))
    ).toEqual({ kind: 'recovery-required', reason: 'corrupt' })
  })

  it('preserves a newer version and reports it as unsupported', () => {
    const raw = JSON.stringify({ version: 2, watchlist: [], favorites: [] })
    const storage = createFakeStorage({ raw })

    expect(readLibrary(storage)).toEqual({
      kind: 'recovery-required',
      reason: 'unsupported-version',
      version: 2,
    })
    expect(currentRaw(storage)).toBe(raw)
  })

  it('retains a version 1 envelope through the empty migration chain', () => {
    const library = savedEnvelope({ favorites: [savedEntry()] })
    expect(readLibrary(createFakeStorage({ raw: JSON.stringify(library) }))).toEqual({
      kind: 'ready',
      library,
    })
  })

  it('tolerates unknown fields', () => {
    const raw = JSON.stringify({
      version: 1,
      watchlist: [{ ...savedEntry(), accountId: 'secret' }],
      favorites: [],
      extra: true,
    })
    const result = readLibrary(createFakeStorage({ raw }))

    expect(result.kind).toBe('ready')
    if (result.kind === 'ready') {
      expect('accountId' in (result.library.watchlist[0] ?? {})).toBe(false)
    }
  })

  it('normalizes an invalid savedAt instead of dropping the entry', () => {
    const raw = JSON.stringify({
      version: 1,
      watchlist: [{ ...savedEntry(), savedAt: 'yesterday' }],
      favorites: [],
    })
    const result = readLibrary(createFakeStorage({ raw }))

    expect(result.kind).toBe('ready')
    if (result.kind === 'ready') {
      expect(result.library.watchlist[0]?.savedAt).toBe(SAVED_TIME_SENTINEL)
    }
  })

  it('drops structurally invalid entries individually', () => {
    const raw = JSON.stringify({
      version: 1,
      watchlist: [savedEntry(), { mediaType: 'movie', itemId: MOVIE_ID }],
      favorites: [],
    })
    const result = readLibrary(createFakeStorage({ raw }))

    expect(result.kind).toBe('ready')
    if (result.kind === 'ready') {
      expect(result.library.watchlist).toHaveLength(1)
    }
  })

  it('retains an unusable identity as an unreadable entry', () => {
    const raw = JSON.stringify({
      version: 1,
      watchlist: [savedEntry({ itemId: 'short' })],
      favorites: [],
    })
    const result = readLibrary(createFakeStorage({ raw }))

    expect(result.kind).toBe('ready')
    if (result.kind === 'ready') {
      expect(result.library.watchlist[0]?.itemId).toBe('short')
    }
  })

  it('reports unavailable when storage access throws', () => {
    expect(readLibrary(createFakeStorage({ throwOnGet: true }))).toEqual({ kind: 'unavailable' })
    expect(readLibrary(null)).toEqual({ kind: 'unavailable' })
  })
})

describe('writeLibrary', () => {
  it('writes and verifies the stored envelope', () => {
    const storage = createFakeStorage()
    const library = savedEnvelope({ watchlist: [savedEntry()] })

    expect(writeLibrary(library, storage)).toBe('written')
    expect(JSON.parse(currentRaw(storage) ?? '{}')).toEqual(library)
  })

  it('reports unavailable without a storage object', () => {
    expect(writeLibrary(savedEnvelope(), null)).toBe('unavailable')
  })

  it('reports write failure when setItem throws', () => {
    expect(writeLibrary(savedEnvelope(), createFakeStorage({ throwOnSet: true }))).toBe(
      'write-failed'
    )
  })

  it('reports verification failure when the immediate re-read differs', () => {
    expect(writeLibrary(savedEnvelope(), createFakeStorage({ storeAs: '{}' }))).toBe(
      'verification-failed'
    )
  })

  it('reports verification failure when the re-read throws', () => {
    let reads = 0
    const storage: SavedStorage = {
      getItem: () => {
        reads += 1
        if (reads > 1) {
          throw new Error('storage became unavailable')
        }
        return null
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    expect(writeLibrary(savedEnvelope(), storage)).toBe('verification-failed')
  })

  it('reset writes an empty envelope', () => {
    const storage = createFakeStorage({
      raw: JSON.stringify(savedEnvelope({ watchlist: [savedEntry()] })),
    })

    expect(resetLibrary(storage)).toBe('written')
    expect(JSON.parse(currentRaw(storage) ?? '{}')).toEqual(savedEnvelope())
  })
})
