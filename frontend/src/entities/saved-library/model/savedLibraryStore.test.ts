import { describe, expect, it, vi } from 'vitest'

import { MOVIE_ID, TV_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEnvelope, savedEntry, savedSnapshot } from '@/test/fixtures/saved'

import { SAVED_LIBRARY_STORAGE_KEY } from './constants'
import { serializeLibrary } from './savedLibraryPersistence'
import type { SavedStorage } from './savedLibraryPersistence'
import { createSavedLibraryStore } from './savedLibraryStore'
import type { SavedEventTarget } from './savedLibraryStore'

interface FakeStorage extends SavedStorage {
  readonly raw: () => string | null
  readonly setRaw: (value: string | null) => void
  readonly failWrites: (fail: boolean) => void
  readonly breakReads: (broken: boolean) => void
}

const createFakeStorage = (initial: string | null = null): FakeStorage => {
  let value = initial
  let shouldFail = false
  let readsBroken = false
  return {
    getItem: (key) => {
      if (readsBroken) {
        throw new Error('storage unavailable')
      }
      return key === SAVED_LIBRARY_STORAGE_KEY ? value : null
    },
    setItem: (key, next) => {
      if (shouldFail) {
        throw new Error('quota exceeded')
      }
      if (key === SAVED_LIBRARY_STORAGE_KEY) {
        value = next
      }
    },
    removeItem: () => {
      value = null
    },
    raw: () => value,
    setRaw: (next) => {
      value = next
    },
    failWrites: (fail) => {
      shouldFail = fail
    },
    breakReads: (broken) => {
      readsBroken = broken
    },
  }
}

interface FakeEventTarget extends SavedEventTarget {
  readonly emit: (event: { readonly key: string | null }) => void
}

const createEventTarget = (): FakeEventTarget => {
  const listeners = new Set<(event: { readonly key: string | null }) => void>()
  return {
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
    emit: (event) => {
      listeners.forEach((listener) => listener(event))
    },
  }
}

const createStore = (storage: SavedStorage | null) =>
  createSavedLibraryStore({ storage, eventTarget: createEventTarget(), now: () => SAVED_AT })

describe('saved library store', () => {
  it('starts loading and becomes ready from persisted data', async () => {
    const storage = createFakeStorage(
      serializeLibrary(savedEnvelope({ watchlist: [savedEntry()] }))
    )
    const store = createStore(storage)

    expect(store.getSnapshot().status).toBe('loading')
    const unsubscribe = store.subscribe(() => undefined)
    await Promise.resolve()
    expect(store.getSnapshot().status).toBe('ready')
    expect(store.getSnapshot().counts.watchlist).toBe(1)
    unsubscribe()
  })

  it('adds, removes, toggles, and clears collections', () => {
    const storage = createFakeStorage()
    const store = createStore(storage)
    store.subscribe(() => undefined)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('added')
    expect(store.getSnapshot().counts.watchlist).toBe(1)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('already-present')
    expect(store.getSnapshot().counts.watchlist).toBe(1)

    expect(store.toggle('favorites', savedSnapshot()).outcome).toBe('added')
    expect(store.getSnapshot().counts.favorites).toBe(1)

    expect(store.remove('watchlist', { mediaType: 'movie', itemId: MOVIE_ID }).outcome).toBe(
      'removed'
    )
    expect(store.getSnapshot().counts.watchlist).toBe(0)

    expect(store.clearCollection('favorites').outcome).toBe('cleared')
    expect(store.getSnapshot().status).toBe('empty')
  })

  it('applies changes for the session and reports unavailable storage', () => {
    const store = createStore(null)
    store.subscribe(() => undefined)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('unavailable')
    expect(store.getSnapshot().counts.watchlist).toBe(1)
    expect(store.getSnapshot().status).toBe('ready')
  })

  it('keeps prior state when a write fails', () => {
    const storage = createFakeStorage()
    const store = createStore(storage)
    store.subscribe(() => undefined)
    storage.failWrites(true)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('write-failed')
    expect(store.getSnapshot().counts.watchlist).toBe(0)
    expect(store.getSnapshot().status).toBe('empty')
  })

  it('rebases a delta on the latest persisted envelope', () => {
    const storage = createFakeStorage()
    const store = createStore(storage)
    store.subscribe(() => undefined)

    storage.setRaw(
      serializeLibrary(
        savedEnvelope({
          watchlist: [savedEntry({ mediaType: 'tv', itemId: TV_ID, title: 'Other' })],
        })
      )
    )

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('added')
    expect(store.getSnapshot().counts.watchlist).toBe(2)
    const stored = JSON.parse(storage.raw() ?? '{}') as { watchlist: unknown[] }
    expect(stored.watchlist).toHaveLength(2)
  })

  it('notifies same-tab subscribers and supports unsubscribe', () => {
    const storage = createFakeStorage()
    const store = createStore(storage)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    listener.mockClear()

    store.add('watchlist', savedSnapshot())
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.add('favorites', savedSnapshot())
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reloads on a matching storage event', () => {
    const storage = createFakeStorage()
    const eventTarget = createEventTarget()
    const store = createSavedLibraryStore({ storage, eventTarget, now: () => SAVED_AT })
    const listener = vi.fn()
    store.subscribe(listener)

    storage.setRaw(serializeLibrary(savedEnvelope({ favorites: [savedEntry()] })))
    eventTarget.emit({ key: SAVED_LIBRARY_STORAGE_KEY })

    expect(store.getSnapshot().counts.favorites).toBe(1)
    expect(listener).toHaveBeenCalled()
  })

  it('ignores storage events for unrelated keys', () => {
    const storage = createFakeStorage()
    const eventTarget = createEventTarget()
    const store = createSavedLibraryStore({ storage, eventTarget, now: () => SAVED_AT })
    store.subscribe(() => undefined)

    storage.setRaw(serializeLibrary(savedEnvelope({ favorites: [savedEntry()] })))
    eventTarget.emit({ key: 'other-key' })

    expect(store.getSnapshot().counts.favorites).toBe(0)
  })

  it('resets corrupt data only after the explicit call', async () => {
    const raw = '{not json'
    const storage = createFakeStorage(raw)
    const store = createStore(storage)
    store.subscribe(() => undefined)
    await Promise.resolve()

    expect(store.getSnapshot().status).toBe('recovery-required')
    expect(storage.raw()).toBe(raw)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('write-failed')
    expect(storage.raw()).toBe(raw)

    expect(store.resetUnreadable().outcome).toBe('reset')
    expect(store.getSnapshot().status).toBe('empty')
    expect(JSON.parse(storage.raw() ?? '{}')).toEqual(savedEnvelope())
  })
  it('treats removing an absent entry as a durable no-op', () => {
    const store = createStore(createFakeStorage())
    store.subscribe(() => undefined)

    expect(store.remove('watchlist', { mediaType: 'movie', itemId: MOVIE_ID }).outcome).toBe(
      'already-absent'
    )
    expect(store.getSnapshot().status).toBe('empty')
  })

  it('reloads when storage is cleared in another tab', () => {
    const storage = createFakeStorage(
      serializeLibrary(savedEnvelope({ watchlist: [savedEntry()] }))
    )
    const eventTarget = createEventTarget()
    const store = createSavedLibraryStore({ storage, eventTarget, now: () => SAVED_AT })
    store.subscribe(() => undefined)

    storage.setRaw(serializeLibrary(savedEnvelope()))
    eventTarget.emit({ key: null })

    expect(store.getSnapshot().status).toBe('empty')
  })

  it('reports reset unavailable without a storage object', () => {
    const store = createStore(null)
    store.subscribe(() => undefined)

    expect(store.resetUnreadable().outcome).toBe('unavailable')
    expect(store.getSnapshot().status).toBe('empty')
  })

  it('reports reset write failure without destroying stored data', () => {
    const storage = createFakeStorage(
      serializeLibrary(savedEnvelope({ watchlist: [savedEntry()] }))
    )
    const store = createStore(storage)
    store.subscribe(() => undefined)
    storage.failWrites(true)

    expect(store.resetUnreadable().outcome).toBe('write-failed')
    expect(JSON.parse(storage.raw() ?? '{}')).toEqual(savedEnvelope({ watchlist: [savedEntry()] }))
  })

  it('stops listening for cross-tab changes after dispose', () => {
    const storage = createFakeStorage()
    const eventTarget = createEventTarget()
    const store = createSavedLibraryStore({ storage, eventTarget, now: () => SAVED_AT })
    store.subscribe(() => undefined)
    store.dispose()

    storage.setRaw(serializeLibrary(savedEnvelope({ favorites: [savedEntry()] })))
    eventTarget.emit({ key: SAVED_LIBRARY_STORAGE_KEY })

    expect(store.getSnapshot().counts.favorites).toBe(0)
  })

  it('falls back to the session when a later read is unavailable', () => {
    const storage = createFakeStorage()
    const store = createStore(storage)
    store.subscribe(() => undefined)
    storage.breakReads(true)

    expect(store.add('watchlist', savedSnapshot()).outcome).toBe('unavailable')
    expect(store.getSnapshot().counts.watchlist).toBe(1)
  })
})
