import { useTranslation } from 'react-i18next'

import type { CollectionId, SavedLibraryStore, SavedSnapshotInput } from '@/entities/saved-library'
import { SAVED_ACTION_KEYS } from '@/entities/saved-library'
import { Button, LiveRegion } from '@/shared/ui'

import { useSavedTitleControls } from '../model/useSavedTitleControls'

export interface SaveToListControlsProps {
  readonly collection: CollectionId
  readonly title: string
  readonly snapshot: SavedSnapshotInput
  readonly store?: SavedLibraryStore
}

export const SaveToListControls = ({
  collection,
  title,
  snapshot,
  store,
}: SaveToListControlsProps) => {
  const { t } = useTranslation()
  const controls = useSavedTitleControls({
    collection,
    title,
    snapshot,
    ...(store === undefined ? {} : { store }),
  })
  const actionKeys = SAVED_ACTION_KEYS[collection]
  const visibleKey = controls.isSaved ? actionKeys.remove : actionKeys.add
  const accessibleKey = controls.isSaved ? actionKeys.a11yRemove : actionKeys.a11yAdd

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        aria-pressed={controls.isSaved}
        aria-busy={controls.pending}
        aria-label={t(accessibleKey, { title })}
        disabled={controls.pending}
        onClick={controls.toggle}
      >
        {t(visibleKey)}
      </Button>
      <p className="text-caption text-text-muted">{t('saved.storageNotice.hint')}</p>
      <LiveRegion message={controls.announcement} />
    </div>
  )
}
