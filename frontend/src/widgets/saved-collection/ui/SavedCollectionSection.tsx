import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionId, SavedEntry, SavedLibraryStore } from '@/entities/saved-library'
import {
  SAVED_COLLECTION_PATHS,
  SAVED_COUNT_KEY,
  SAVED_DESCRIPTION_KEY,
  SAVED_EMPTY_DESCRIPTION_KEY,
  SAVED_EMPTY_TITLE_KEY,
  SAVED_TITLE_KEY,
} from '@/entities/saved-library'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Button, ErrorState, Link, LiveRegion } from '@/shared/ui'

import type { SavedEntryView } from '../model/savedEntryView'
import { SavedCollectionManage } from './SavedCollectionManage'
import { SavedCollectionNav } from './SavedCollectionNav'
import { SavedCollectionSkeleton } from './SavedCollectionSkeleton'
import { SavedEntryList } from './SavedEntryList'
import { SavedStorageNotice } from './SavedStorageNotice'

export type SavedSectionStatus = 'loading' | 'empty' | 'populated' | 'error' | 'recovery'

export interface SavedCollectionSectionProps {
  readonly collection: CollectionId
  readonly status: SavedSectionStatus
  readonly entries: readonly SavedEntry[]
  readonly totalCount: number
  readonly visibleCount: number
  readonly onShowMore: () => void
  readonly onRetry?: () => void
  readonly views?: readonly SavedEntryView[]
  readonly store?: SavedLibraryStore
}

export const SavedCollectionSection = ({
  collection,
  status,
  entries,
  totalCount,
  visibleCount,
  onShowMore,
  onRetry,
  views,
  store,
}: SavedCollectionSectionProps) => {
  const { t } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const resetSavedData = (): void => {
    store?.resetUnreadable()
    setConfirmReset(false)
    setAnnouncement(t('saved.feedback.dataReset'))
  }

  return (
    <div className="flex flex-col gap-stack">
      <SavedCollectionNav activeCollection={collection} />
      <div className="flex flex-col gap-1">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t(SAVED_TITLE_KEY[collection])}
        </h1>
        <p className="max-w-prose text-text-muted">{t(SAVED_DESCRIPTION_KEY[collection])}</p>
        {status === 'populated' ? (
          <p className="text-caption text-text-muted tabular-nums">
            {t(SAVED_COUNT_KEY, { count: totalCount })}
          </p>
        ) : null}
      </div>

      <SavedStorageNotice />

      {status === 'loading' ? <SavedCollectionSkeleton /> : null}

      {status === 'empty' ? (
        <section className="flex flex-col items-start gap-stack rounded-card border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-title text-text">{t(SAVED_EMPTY_TITLE_KEY[collection])}</h2>
          <p className="max-w-prose text-text-muted">
            {t(SAVED_EMPTY_DESCRIPTION_KEY[collection])}
          </p>
          <Link to="/browse/movies" className="min-h-11">
            {t('saved.empty.action')}
          </Link>
        </section>
      ) : null}

      {status === 'error' ? (
        <ErrorState
          title={t('saved.error.title')}
          description={t('saved.error.description')}
          {...(onRetry === undefined ? {} : { retry: { label: t('saved.error.retry'), onRetry } })}
          homeAction={{ label: t('saved.empty.action'), href: '/browse/movies' }}
        />
      ) : null}

      {status === 'recovery' ? (
        <section
          role="alert"
          aria-labelledby="saved-recovery-heading"
          className="flex flex-col items-start gap-stack rounded-card border border-border bg-surface p-6 sm:p-8"
        >
          <h2 id="saved-recovery-heading" className="text-title text-text">
            {t('saved.recovery.title')}
          </h2>
          <p className="max-w-prose text-text-muted">{t('saved.recovery.description')}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={SAVED_COLLECTION_PATHS[collection]}
              className="inline-flex min-h-11 items-center gap-2 rounded-control text-primary underline-offset-4 transition-colors duration-150 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t('saved.recovery.reload')}
            </a>
            {confirmReset ? (
              <>
                <Button variant="primary" onClick={resetSavedData}>
                  {t('saved.recovery.confirmReset')}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                  {t('saved.manage.cancel')}
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                {t('saved.recovery.reset')}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {status === 'populated' ? (
        <SavedEntryList
          entries={entries}
          collection={collection}
          totalCount={totalCount}
          visibleCount={visibleCount}
          onShowMore={onShowMore}
          views={views}
          store={store}
        />
      ) : null}

      {store !== undefined && (status === 'populated' || status === 'empty') ? (
        <SavedCollectionManage collection={collection} store={store} />
      ) : null}

      <LiveRegion message={announcement} />
    </div>
  )
}
