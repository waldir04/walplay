import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import {
  CatalogCard,
  CatalogCardSkeleton,
  CatalogGrid,
  SECTION_LABEL_KEYS,
  flattenCatalogPages,
  isInterfaceLanguage,
  stateCopyKeys,
  stateForError,
  useCategoryQuery,
} from '@/entities/catalog'
import type { InterfaceLanguage, MediaType, SectionId } from '@/entities/catalog'
import { LoadMoreControl } from '@/features/load-more-catalog'
import { Button, LiveRegion } from '@/shared/ui'

export interface CatalogCategoryListProps {
  readonly mediaType: MediaType
  readonly section: SectionId
  readonly language: InterfaceLanguage
}

const formatUpdatedAt = (value: string, language: InterfaceLanguage): string =>
  new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const CatalogCategoryList = ({ mediaType, section, language }: CatalogCategoryListProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const query = useCategoryQuery(mediaType, section, language)
  const [announcement, setAnnouncement] = useState('')
  const previousCount = useRef(0)
  const requestedNextPage = useRef(false)
  const endStatusRef = useRef<HTMLParagraphElement>(null)

  const { items } = flattenCatalogPages(query.data?.pages ?? [])
  const lastPage = query.data?.pages.at(-1)
  const hasMore = lastPage?.data.hasMore ?? false
  const meta = lastPage?.meta
  const isInitialLoading = query.isPending
  const isInitialError = query.isError && items.length === 0
  const isLaterPageError = query.isError && items.length > 0

  useEffect(() => {
    if (previousCount.current > 0 && items.length > previousCount.current) {
      const added = items.length - previousCount.current
      setAnnouncement(
        t(added === 1 ? 'catalog.states.appended_one' : 'catalog.states.appended_other', {
          count: added,
        })
      )
    }
    previousCount.current = items.length
  }, [items.length, t])

  useEffect(() => {
    if (requestedNextPage.current && !query.isFetchingNextPage && !hasMore && items.length > 0) {
      requestedNextPage.current = false
      endStatusRef.current?.focus()
    }
  }, [hasMore, items.length, query.isFetchingNextPage])

  const loadMore = (): void => {
    if (query.isFetchingNextPage || !hasMore) {
      return
    }
    requestedNextPage.current = true
    void query.fetchNextPage()
  }

  const languageCode = isInterfaceLanguage(language) ? language : 'en'

  return (
    <div className="flex flex-col gap-4">
      <LiveRegion message={announcement} />

      {isInitialLoading ? (
        <ul
          aria-busy="true"
          aria-label={t('catalog.states.sectionLoading')}
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {Array.from({ length: 10 }, (_, index) => (
            <li key={index}>
              <CatalogCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}

      {isInitialError ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text">{t('catalog.states.error.title')}</p>
          <p className="mt-1 text-caption text-text-muted">
            {t('catalog.states.error.description')}
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
            {t('catalog.actions.retry')}
          </Button>
        </div>
      ) : null}

      {!isInitialLoading && !isInitialError && items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text">
            {query.isError
              ? t(stateCopyKeys(stateForError(query.error)).title)
              : t('catalog.states.empty.title')}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {query.isError
              ? t(stateCopyKeys(stateForError(query.error)).description)
              : t('catalog.states.empty.description')}
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
            {t('catalog.actions.retry')}
          </Button>
        </div>
      ) : null}

      {items.length > 0 && meta ? (
        <>
          {meta.stale ? (
            <p className="text-caption text-warning">
              {t('catalog.states.stale.lastUpdated', {
                date: formatUpdatedAt(meta.lastUpdatedAt, languageCode),
              })}
            </p>
          ) : null}
          <CatalogGrid label={t(SECTION_LABEL_KEYS[section])}>
            {items.map((item) => (
              <li key={item.id}>
                <CatalogCard item={item} from={location.pathname} />
              </li>
            ))}
          </CatalogGrid>

          {isLaterPageError ? (
            <div role="alert" className="rounded-card border border-border bg-surface p-4">
              <p className="text-caption text-text-muted">
                {t('catalog.states.error.description')}
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                disabled={query.isFetchingNextPage}
                onClick={loadMore}
              >
                {t('catalog.actions.retry')}
              </Button>
            </div>
          ) : null}

          <LoadMoreControl
            hasMore={hasMore}
            isFetching={query.isFetchingNextPage}
            onLoadMore={loadMore}
          />

          {!hasMore ? (
            <p
              ref={endStatusRef}
              tabIndex={-1}
              className="text-center text-caption text-text-muted"
            >
              {t('catalog.states.endOfList')}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
