import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { entryIdentity, SAVED_BATCH_SIZE, SAVED_LIST_LABEL_KEY } from '@/entities/saved-library'
import type { CollectionId, SavedEntry, SavedLibraryStore } from '@/entities/saved-library'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Button, LiveRegion } from '@/shared/ui'

import type { SavedEntryView } from '../model/savedEntryView'
import { SavedEntryCard } from './SavedEntryCard'

export interface SavedEntryListProps {
  readonly entries: readonly SavedEntry[]
  readonly collection: CollectionId
  readonly totalCount: number
  readonly visibleCount: number
  readonly onShowMore: () => void
  readonly views?: readonly SavedEntryView[]
  readonly store?: SavedLibraryStore
}

export const SavedEntryList = ({
  entries,
  collection,
  totalCount,
  visibleCount,
  onShowMore,
  views,
  store,
}: SavedEntryListProps) => {
  const { t } = useTranslation()
  const [announcement, setAnnouncement] = useState('')
  const actionRefs = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocusIndex = useRef<number | null>(null)
  const hasMore = entries.length < totalCount
  const viewByIdentity = new Map(
    (views ?? []).map((view) => [entryIdentity(view.entry), view] as const)
  )

  useEffect(() => {
    const index = pendingFocusIndex.current
    if (index === null) {
      return
    }
    pendingFocusIndex.current = null

    const target = entries[index] ?? entries[entries.length - 1]
    if (target === undefined) {
      document.getElementById(PAGE_HEADING_ID)?.focus()
      return
    }
    actionRefs.current.get(entryIdentity(target))?.focus()
  }, [entries])

  const handleShowMore = (): void => {
    const nextVisible = Math.min(visibleCount + SAVED_BATCH_SIZE, totalCount)
    setAnnouncement(
      t('saved.showMoreAnnouncement', { from: 1, to: nextVisible, total: totalCount })
    )
    onShowMore()
  }

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label={t(SAVED_LIST_LABEL_KEY[collection])} className="flex flex-col gap-3">
        {entries.map((entry, index) => {
          const identity = entryIdentity(entry)
          return (
            <li key={identity}>
              <SavedEntryCard
                entry={entry}
                collection={collection}
                view={viewByIdentity.get(identity)}
                store={store}
                onAnnounce={setAnnouncement}
                onRemoveStart={() => {
                  pendingFocusIndex.current = index
                }}
                removeButtonRef={(node) => {
                  if (node === null) {
                    actionRefs.current.delete(identity)
                    return
                  }
                  actionRefs.current.set(identity, node)
                }}
              />
            </li>
          )
        })}
      </ul>
      {hasMore ? (
        <div>
          <Button variant="secondary" onClick={handleShowMore}>
            {t('saved.showMore')}
          </Button>
        </div>
      ) : null}
      <LiveRegion message={announcement} />
    </div>
  )
}
