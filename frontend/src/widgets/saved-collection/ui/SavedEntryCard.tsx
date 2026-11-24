import { useState } from 'react'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PosterFallback,
  resolveInterfaceLanguage,
  titleDetailPath,
  toLocaleCode,
} from '@/entities/catalog'
import {
  entryIdentity,
  isUsableSavedIdentity,
  SAVED_IN_OTHER_KEY,
  useSavedCollection,
} from '@/entities/saved-library'
import type { CollectionId, SavedEntry, SavedLibraryStore } from '@/entities/saved-library'
import { SavedEntryActions } from '@/features/toggle-saved-title'
import { Button, Link } from '@/shared/ui'

import type { SavedEntryView } from '../model/savedEntryView'

export interface SavedEntryCardProps {
  readonly entry: SavedEntry
  readonly collection: CollectionId
  readonly view?: SavedEntryView
  readonly onRemoveStart?: () => void
  readonly onAnnounce?: (message: string) => void
  readonly store?: SavedLibraryStore
  readonly removeButtonRef?: Ref<HTMLButtonElement>
}

const formatSavedDate = (savedAt: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(savedAt))

export const SavedEntryCard = ({
  entry,
  collection,
  view,
  onRemoveStart,
  onAnnounce,
  store,
  removeButtonRef,
}: SavedEntryCardProps) => {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const state = view?.state ?? 'hydrated'
  const current = state === 'hydrated' ? view?.item : undefined
  const otherCollection: CollectionId = collection === 'watchlist' ? 'favorites' : 'watchlist'
  const other = useSavedCollection(otherCollection, store)
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))

  const title = current?.title ?? entry.title
  const releaseYear = current?.releaseYear ?? entry.releaseYear
  const poster = current?.poster ?? entry.poster
  const mediaType = current?.mediaType ?? entry.mediaType
  const mediaTypeLabel = t(`catalog.mediaType.${mediaType}`)
  const usable = isUsableSavedIdentity(entry)
  const canLink = usable && state !== 'not-in-catalog' && state !== 'unreadable'
  const unreadable = state === 'unreadable'
  const showPoster = poster !== undefined && !imageFailed
  const inOther =
    !unreadable &&
    other.entries.some((candidate) => entryIdentity(candidate) === entryIdentity(entry))

  const titleNode = canLink ? (
    <Link
      to={titleDetailPath(entry.mediaType, entry.itemId)}
      className="text-body font-semibold text-text underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {title}
    </Link>
  ) : (
    <span className="break-words text-body font-semibold text-text">{title}</span>
  )

  return (
    <article
      aria-busy={state === 'refreshing'}
      className="flex gap-3 rounded-card border border-border bg-surface p-3"
    >
      <div className="w-16 shrink-0">
        {showPoster && poster ? (
          <img
            src={poster.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="aspect-[2/3] w-full rounded-control border border-border object-cover"
          />
        ) : (
          <PosterFallback title={title} mediaTypeLabel={mediaTypeLabel} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="break-words text-body text-text">{titleNode}</h3>
        <p className="text-caption text-text-muted">
          {mediaTypeLabel}
          {releaseYear === undefined ? '' : ` · ${releaseYear}`}
        </p>
        <p className="text-caption text-text-muted">
          {t('saved.entry.savedOn', { date: formatSavedDate(entry.savedAt, locale) })}
        </p>
        {inOther ? (
          <p className="text-caption text-text-muted">{t(SAVED_IN_OTHER_KEY[otherCollection])}</p>
        ) : null}
        {state === 'refreshing' ? (
          <p className="text-caption text-text-muted">{t('saved.entry.refreshing')}</p>
        ) : null}
        {state === 'temporarily-unavailable' ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-caption text-text-muted">
              {t('saved.entry.temporarilyUnavailable')}
            </p>
            {view?.retry === undefined ? null : (
              <Button variant="ghost" onClick={view.retry}>
                {t('saved.entry.retryDetails')}
              </Button>
            )}
          </div>
        ) : null}
        {state === 'not-in-catalog' ? (
          <p className="text-caption text-text-muted">{t('saved.entry.notInCatalog')}</p>
        ) : null}
        {unreadable ? (
          <p className="text-caption text-text-muted">{t('saved.entry.unreadable')}</p>
        ) : null}
        <div className="mt-2">
          <SavedEntryActions
            collection={collection}
            entry={entry}
            onRemoveStart={onRemoveStart}
            onAnnounce={onAnnounce}
            store={store}
            removeButtonRef={removeButtonRef}
            showOther={!unreadable}
          />
        </div>
      </div>
    </article>
  )
}
