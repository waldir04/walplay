import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  SavedEntry,
  SavedLibrarySnapshot,
  SavedLibraryStore,
  SavedMutationOutcome,
} from '@/entities/saved-library'
import { createSavedLibraryStore } from '@/entities/saved-library'
import { MOVIE_ID } from '@/test/fixtures/catalog'
import { SAVED_AT, savedEntry, savedSnapshot } from '@/test/fixtures/saved'

import { useSavedTitleControls } from './useSavedTitleControls'

const createStorage = () => {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
}

const readySnapshot = (watchlist: readonly SavedEntry[]): SavedLibrarySnapshot => ({
  status: watchlist.length === 0 ? 'empty' : 'ready',
  watchlist,
  favorites: [],
  counts: { watchlist: watchlist.length, favorites: 0 },
  mutationError: null,
  recoveryReason: null,
})

const createStubStore = (
  outcome: SavedMutationOutcome,
  initial: readonly SavedEntry[] = []
): { store: SavedLibraryStore; toggle: ReturnType<typeof vi.fn> } => {
  const snapshot = readySnapshot(initial)
  const toggle = vi.fn(() => ({ outcome }))
  const store: SavedLibraryStore = {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    add: () => ({ outcome }),
    remove: () => ({ outcome }),
    toggle,
    clearCollection: () => ({ outcome: 'cleared' }),
    clearAll: () => ({ outcome: 'cleared' }),
    resetUnreadable: () => ({ outcome: 'reset' }),
    reload: () => undefined,
    dispose: () => undefined,
  }
  return { store, toggle }
}

const titleProps = {
  collection: 'watchlist' as const,
  title: 'Fight Club',
  snapshot: savedSnapshot(),
}

describe('useSavedTitleControls', () => {
  it('adds and removes through the shared store', async () => {
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))
    await waitFor(() => expect(result.current.isSaved).toBe(false))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.isSaved).toBe(true))
    expect(result.current.announcement).toBe('Fight Club added to your watchlist.')

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.isSaved).toBe(false))
    expect(result.current.announcement).toBe('Fight Club removed from your watchlist.')
  })

  it('announces an already-present duplicate', async () => {
    const { store } = createStubStore('already-present')
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isSaved).toBe(false)
    expect(result.current.announcement).toBe('Fight Club is already in your watchlist.')
  })

  it('announces an absent removal', async () => {
    const { store } = createStubStore('already-absent')
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.announcement).toBe('Fight Club is not in your watchlist.')
  })

  it('keeps membership unchanged and announces a write failure', async () => {
    const { store } = createStubStore('write-failed')
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isSaved).toBe(false)
    expect(result.current.announcement).toBe(
      'Fight Club could not be saved on this device. Try again.'
    )
  })

  it('announces a failed removal when the title was saved', async () => {
    const { store } = createStubStore('write-failed', [savedEntry()])
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isSaved).toBe(true)
    expect(result.current.announcement).toBe('Fight Club could not be removed. Try again.')
  })

  it('announces session-only storage', async () => {
    const { store } = createStubStore('unavailable')
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.announcement).toBe(
      'This change applies only to this session because this browser cannot store saved titles.'
    )
  })

  it('prevents re-entry while a mutation is pending', async () => {
    const { store, toggle } = createStubStore('added')
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))

    await act(async () => {
      result.current.toggle()
      result.current.toggle()
      await Promise.resolve()
    })

    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('never calls the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const store = createSavedLibraryStore({ storage: createStorage(), now: () => SAVED_AT })
    const { result } = renderHook(() => useSavedTitleControls({ ...titleProps, store }))
    await waitFor(() => expect(result.current.isSaved).toBe(false))

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(store.getSnapshot().watchlist[0]?.itemId).toBe(MOVIE_ID)
  })
})
