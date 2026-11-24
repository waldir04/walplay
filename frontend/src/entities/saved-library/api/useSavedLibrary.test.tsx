import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOVIE_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEnvelope, savedEntry, savedSnapshot } from '@/test/fixtures/saved'

import { SAVED_LIBRARY_STORAGE_KEY } from '../model/constants'
import { serializeLibrary } from '../model/savedLibraryPersistence'
import type { SavedStorage } from '../model/savedLibraryPersistence'
import { createSavedLibraryStore } from '../model/savedLibraryStore'
import type { SavedEventTarget } from '../model/savedLibraryStore'
import { useSavedCollection, useSavedLibrary } from './useSavedLibrary'

const createStorage = (initial: string | null = null) => {
  let value = initial
  const storage: SavedStorage = {
    getItem: (key) => (key === SAVED_LIBRARY_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === SAVED_LIBRARY_STORAGE_KEY) {
        value = next
      }
    },
    removeItem: () => {
      value = null
    },
  }
  return { storage, setRaw: (next: string | null) => (value = next) }
}

const createEventTarget = () => {
  const listeners = new Set<(event: { readonly key: string | null }) => void>()
  const target: SavedEventTarget = {
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
  }
  return {
    target,
    emit: (key: string | null) => listeners.forEach((listener) => listener({ key })),
  }
}

describe('useSavedLibrary', () => {
  it('reports loading first and then ready', async () => {
    const { storage } = createStorage(
      serializeLibrary(savedEnvelope({ watchlist: [savedEntry()] }))
    )
    const store = createSavedLibraryStore({ storage })

    const { result } = renderHook(() => useSavedLibrary(store))
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.counts.watchlist).toBe(1)
  })

  it('updates membership after add and remove', async () => {
    const { storage } = createStorage()
    const store = createSavedLibraryStore({ storage, now: () => SAVED_AT })
    const { result } = renderHook(() => useSavedCollection('watchlist', store))
    await waitFor(() => expect(result.current.status).toBe('empty'))

    act(() => {
      store.add('watchlist', savedSnapshot())
    })
    expect(result.current.isSaved({ mediaType: 'movie', itemId: MOVIE_ID })).toBe(true)

    expect(result.current.isSavedIn('watchlist', { mediaType: 'movie', itemId: MOVIE_ID })).toBe(
      true
    )
    expect(result.current.isSavedIn('favorites', { mediaType: 'movie', itemId: MOVIE_ID })).toBe(
      false
    )

    act(() => {
      store.remove('watchlist', { mediaType: 'movie', itemId: MOVIE_ID })
    })
    expect(result.current.isSaved({ mediaType: 'movie', itemId: MOVIE_ID })).toBe(false)
  })

  it('exposes per-collection counts and cross-collection membership', async () => {
    const { storage } = createStorage()
    const store = createSavedLibraryStore({ storage, now: () => SAVED_AT })
    const { result } = renderHook(() => useSavedLibrary(store))
    await waitFor(() => expect(result.current.status).toBe('empty'))

    act(() => {
      store.add('watchlist', savedSnapshot())
      store.add('favorites', savedSnapshot())
    })

    expect(result.current.counts).toEqual({ watchlist: 1, favorites: 1 })
  })

  it('reflects a cross-tab storage event', async () => {
    const { storage, setRaw } = createStorage()
    const eventTarget = createEventTarget()
    const store = createSavedLibraryStore({ storage, eventTarget: eventTarget.target })
    const { result } = renderHook(() => useSavedLibrary(store))
    await waitFor(() => expect(result.current.status).toBe('empty'))

    setRaw(serializeLibrary(savedEnvelope({ favorites: [savedEntry()] })))
    act(() => {
      eventTarget.emit(SAVED_LIBRARY_STORAGE_KEY)
    })

    expect(result.current.counts.favorites).toBe(1)
  })
})
