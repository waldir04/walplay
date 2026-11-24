import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionId, SavedLibraryStore, SavedSnapshotInput } from '@/entities/saved-library'
import {
  getSavedLibraryStore,
  hasIdentity,
  SAVED_FEEDBACK_KEYS,
  useSavedLibrary,
} from '@/entities/saved-library'

import type { SavedMutationOutcome } from '@/entities/saved-library'

export interface UseSavedTitleControlsOptions {
  readonly collection: CollectionId
  readonly title: string
  readonly snapshot: SavedSnapshotInput
  readonly store?: SavedLibraryStore
  readonly onAnnounce?: (message: string) => void
}

export interface SavedTitleControls {
  readonly isSaved: boolean
  readonly pending: boolean
  readonly toggle: () => void
  readonly announcement: string
}

const outcomeMessageKey = (
  collection: CollectionId,
  outcome: SavedMutationOutcome,
  wasSaved: boolean
): string => {
  switch (outcome) {
    case 'added':
      return SAVED_FEEDBACK_KEYS.added[collection]
    case 'already-present':
      return SAVED_FEEDBACK_KEYS.already[collection]
    case 'removed':
      return SAVED_FEEDBACK_KEYS.removed[collection]
    case 'already-absent':
      return SAVED_FEEDBACK_KEYS.absent[collection]
    case 'unavailable':
      return 'saved.feedback.sessionOnly'
    case 'write-failed':
      return wasSaved ? 'saved.feedback.removeFailed' : 'saved.feedback.saveFailed'
    default:
      return 'saved.feedback.saveFailed'
  }
}

export const useSavedTitleControls = ({
  collection,
  title,
  snapshot,
  store = getSavedLibraryStore(),
  onAnnounce,
}: UseSavedTitleControlsOptions): SavedTitleControls => {
  const { t } = useTranslation()
  const library = useSavedLibrary(store)
  const isSaved = hasIdentity(library[collection], snapshot)
  const [pending, setPending] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

  const toggle = useCallback(() => {
    if (pendingRef.current) {
      return
    }
    const wasSaved = isSaved
    pendingRef.current = true
    setPending(true)

    queueMicrotask(() => {
      const result = store.toggle(collection, snapshot)
      if (!mountedRef.current) {
        return
      }
      const message = t(outcomeMessageKey(collection, result.outcome, wasSaved), { title })
      setAnnouncement(message)
      onAnnounce?.(message)
      pendingRef.current = false
      setPending(false)
    })
  }, [collection, isSaved, onAnnounce, snapshot, store, t, title])

  return { isSaved, pending, toggle, announcement }
}
