import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionId, SavedLibraryStore } from '@/entities/saved-library'
import {
  SAVED_FEEDBACK_KEYS,
  SAVED_MANAGE_CONFIRM_KEY,
  SAVED_MANAGE_DELETE_KEY,
} from '@/entities/saved-library'
import { Button, LiveRegion } from '@/shared/ui'

type PendingAction = 'collection' | 'all' | null

export interface SavedCollectionManageProps {
  readonly collection: CollectionId
  readonly store: SavedLibraryStore
}

export const SavedCollectionManage = ({ collection, store }: SavedCollectionManageProps) => {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingAction>(null)
  const [announcement, setAnnouncement] = useState('')

  const confirm = (): void => {
    if (pending === 'collection') {
      store.clearCollection(collection)
      setAnnouncement(t(SAVED_FEEDBACK_KEYS.cleared[collection]))
    }
    if (pending === 'all') {
      store.clearAll()
      setAnnouncement(t('saved.feedback.allCleared'))
    }
    setPending(null)
  }

  return (
    <section
      aria-labelledby="saved-manage-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="saved-manage-heading" className="text-title text-text">
        {t('saved.manage.title')}
      </h2>
      <p className="max-w-prose text-caption text-text-muted">{t('saved.manage.description')}</p>
      <div className="flex flex-wrap gap-2">
        {pending === 'collection' ? (
          <>
            <Button variant="primary" onClick={confirm}>
              {t(SAVED_MANAGE_CONFIRM_KEY[collection])}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t('saved.manage.cancel')}
            </Button>
          </>
        ) : pending === 'all' ? (
          <>
            <Button variant="primary" onClick={confirm}>
              {t('saved.manage.confirmDeleteAll')}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t('saved.manage.cancel')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setPending('collection')}>
              {t(SAVED_MANAGE_DELETE_KEY[collection])}
            </Button>
            <Button variant="secondary" onClick={() => setPending('all')}>
              {t('saved.manage.deleteAll')}
            </Button>
          </>
        )}
      </div>
      <LiveRegion message={announcement} />
    </section>
  )
}
