import { useState } from 'react'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionId, SavedEntry, SavedLibraryStore } from '@/entities/saved-library'
import { SAVED_ACTION_KEYS, snapshotFromEntry } from '@/entities/saved-library'
import { Button, LiveRegion } from '@/shared/ui'

import { useSavedTitleControls } from '../model/useSavedTitleControls'

export interface SavedEntryActionsProps {
  readonly collection: CollectionId
  readonly entry: SavedEntry
  readonly onRemoveStart?: () => void
  readonly onAnnounce?: (message: string) => void
  readonly store?: SavedLibraryStore
  readonly removeButtonRef?: Ref<HTMLButtonElement>
  readonly showOther?: boolean
}

export const SavedEntryActions = ({
  collection,
  entry,
  onRemoveStart,
  onAnnounce,
  store,
  removeButtonRef,
  showOther = true,
}: SavedEntryActionsProps) => {
  const { t } = useTranslation()
  const [localAnnouncement, setLocalAnnouncement] = useState('')
  const snapshot = snapshotFromEntry(entry)
  const otherCollection: CollectionId = collection === 'watchlist' ? 'favorites' : 'watchlist'
  const otherKeys = SAVED_ACTION_KEYS[otherCollection]

  const announce = (message: string): void => {
    setLocalAnnouncement(message)
    onAnnounce?.(message)
  }

  const current = useSavedTitleControls({
    collection,
    title: entry.title,
    snapshot,
    onAnnounce: announce,
    ...(store === undefined ? {} : { store }),
  })
  const other = useSavedTitleControls({
    collection: otherCollection,
    title: entry.title,
    snapshot,
    onAnnounce: announce,
    ...(store === undefined ? {} : { store }),
  })

  const otherVisibleKey = other.isSaved ? otherKeys.remove : otherKeys.add
  const otherAccessibleKey = other.isSaved ? otherKeys.a11yRemove : otherKeys.a11yAdd

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        ref={removeButtonRef}
        variant="secondary"
        aria-label={t('saved.actions.a11y.remove', { title: entry.title })}
        aria-busy={current.pending}
        disabled={current.pending}
        onClick={() => {
          onRemoveStart?.()
          current.toggle()
        }}
      >
        {t('saved.actions.remove')}
      </Button>
      {showOther ? (
        <Button
          variant="ghost"
          aria-label={t(otherAccessibleKey, { title: entry.title })}
          aria-busy={other.pending}
          disabled={other.pending}
          onClick={() => other.toggle()}
        >
          {t(otherVisibleKey)}
        </Button>
      ) : null}
      {onAnnounce === undefined ? <LiveRegion message={localAnnouncement} /> : null}
    </div>
  )
}
