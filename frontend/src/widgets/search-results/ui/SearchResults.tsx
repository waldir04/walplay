import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CatalogCard,
  CatalogCardSkeleton,
  CatalogGrid,
  SEARCH_COPY_KEYS,
  flattenSearchPages,
  searchOriginPath,
  searchStateCopyKeys,
  searchStateForError,
  useSearchQuery,
} from '@/entities/catalog'
import type { InterfaceLanguage, SearchQuery } from '@/entities/catalog'
import { Button, LiveRegion } from '@/shared/ui'

export interface SearchResultsProps {
  readonly query: SearchQuery
  readonly language: InterfaceLanguage
  readonly isSettling?: boolean
  readonly onEditQuery?: () => void
  readonly onClearQuery?: () => void
  readonly attribution?: ReactNode
}

const formatUpdatedAt = (value: string, language: InterfaceLanguage): string =>
  new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const SearchResults = ({
  query,
  language,
  isSettling = false,
  onEditQuery,
  onClearQuery,
  attribution,
}: SearchResultsProps) => {
  const { t } = useTranslation()
  const search = useSearchQuery(query, language)
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const previousIdentity = useRef<string | null>(null)
  const previousPageCount = useRef(0)
  const previousItemCount = useRef(0)
  const previousStaleKey = useRef<string | null>(null)
  const loadMoreActivated = useRef(false)
  const endStatusRef = useRef<HTMLParagraphElement>(null)

  const pages = search.data?.pages ?? []
  const { items, hasMore, meta, loadedPageHadNoTitles } = pages.length
    ? flattenSearchPages(pages)
    : { items: [], hasMore: false, meta: undefined, loadedPageHadNoTitles: false }
  const firstPageError = search.isError && items.length === 0 && !search.isFetchNextPageError
  const pageError = search.isFetchNextPageError && items.length > 0
  const refreshFailedWithItems =
    (search.isError || search.isRefetchError) && items.length > 0 && !search.isFetchNextPageError
  const uiState = searchStateForError(search.error)
  const collectionLabel = t('search.results.collectionLabel', { query: query.trimmed })
  const searchOrigin = searchOriginPath(query)

  useEffect(() => {
    if (search.isPending && search.fetchStatus === 'fetching') {
      setPoliteMessage(t('search.states.searching', { query: query.trimmed }))
    }
  }, [search.isPending, search.fetchStatus, query.identity, query.trimmed, t])

  useEffect(() => {
    if (search.data === undefined) {
      return
    }

    const identity = query.identity
    const pageCount = search.data.pages.length

    if (previousIdentity.current !== identity) {
      previousIdentity.current = identity
      previousPageCount.current = pageCount
      previousItemCount.current = items.length
      if (items.length > 0) {
        setPoliteMessage(
          t(items.length === 1 ? 'search.states.found_one' : 'search.states.found_other', {
            count: items.length,
            query: query.trimmed,
          })
        )
      } else if (hasMore) {
        setPoliteMessage(t(SEARCH_COPY_KEYS.interimEmpty))
      } else {
        setPoliteMessage(t(SEARCH_COPY_KEYS.noResults.title, { query: query.trimmed }))
      }
      return
    }

    if (pageCount > previousPageCount.current) {
      const added = items.length - previousItemCount.current
      previousPageCount.current = pageCount
      previousItemCount.current = items.length
      if (loadedPageHadNoTitles) {
        setPoliteMessage(t(SEARCH_COPY_KEYS.interimEmpty))
      } else if (added > 0 && !hasMore) {
        setPoliteMessage(t(SEARCH_COPY_KEYS.endOfResults, { query: query.trimmed }))
      } else if (added > 0) {
        setPoliteMessage(
          t(added === 1 ? 'search.states.appended_one' : 'search.states.appended_other', {
            count: added,
          })
        )
      }
      return
    }

    previousItemCount.current = items.length
  }, [search.data, items.length, hasMore, loadedPageHadNoTitles, query.identity, query.trimmed, t])

  useEffect(() => {
    if (items.length === 0 || meta === undefined || !meta.stale) {
      return
    }
    const staleKey = `${query.identity}:${meta.lastUpdatedAt}`
    if (previousStaleKey.current === staleKey) {
      return
    }
    previousStaleKey.current = staleKey
    setPoliteMessage(
      t(SEARCH_COPY_KEYS.stale, { date: formatUpdatedAt(meta.lastUpdatedAt, language) })
    )
  }, [items.length, meta, query.identity, language, t])

  useEffect(() => {
    if (firstPageError) {
      if (uiState === 'query-invalid') {
        setPoliteMessage(t(searchStateCopyKeys(uiState).title))
      } else {
        setAssertiveMessage(t(searchStateCopyKeys(uiState).title))
      }
      return
    }
    if (pageError) {
      setAssertiveMessage(t(SEARCH_COPY_KEYS.pageError.title))
      return
    }
    setAssertiveMessage('')
  }, [firstPageError, pageError, uiState, t])

  useEffect(() => {
    if (!hasMore && items.length > 0 && loadMoreActivated.current) {
      loadMoreActivated.current = false
      endStatusRef.current?.focus()
    }
  }, [hasMore, items.length])

  if (query.validity !== 'valid') {
    return null
  }

  const handleLoadMore = (): void => {
    if (search.isFetchingNextPage || !hasMore) {
      return
    }
    loadMoreActivated.current = true
    void search.fetchNextPage()
  }

  const retryLabel = t('search.actions.retry')

  return (
    <div className="flex flex-col gap-4" data-settling={isSettling ? 'true' : undefined}>
      <LiveRegion message={politeMessage} />
      <LiveRegion message={assertiveMessage} politeness="assertive" />

      {search.isPending && search.data === undefined ? (
        <ul
          aria-busy="true"
          aria-label={t(SEARCH_COPY_KEYS.loadingLabel)}
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {Array.from({ length: 10 }, (_, index) => (
            <li key={index}>
              <CatalogCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}

      {firstPageError ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-title text-text">{t(searchStateCopyKeys(uiState).title)}</h2>
          <p className="mt-1 text-caption text-text-muted">
            {t(searchStateCopyKeys(uiState).description)}
          </p>
          {uiState !== 'query-invalid' ? (
            <Button
              variant="secondary"
              className="mt-3"
              disabled={search.isFetching}
              onClick={() => {
                if (!search.isFetching) {
                  void search.refetch()
                }
              }}
            >
              {retryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {search.data !== undefined && items.length === 0 && !hasMore ? (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="text-title text-text">
            {t(SEARCH_COPY_KEYS.noResults.title, { query: query.trimmed })}
          </h2>
          <p className="max-w-prose text-caption text-text-muted">
            {t(SEARCH_COPY_KEYS.noResults.description)}
          </p>
          <div className="flex flex-wrap gap-2">
            {onEditQuery === undefined ? null : (
              <Button variant="secondary" onClick={onEditQuery}>
                {t('search.actions.editQuery')}
              </Button>
            )}
            {onClearQuery === undefined ? null : (
              <Button variant="secondary" onClick={onClearQuery}>
                {t('search.actions.clearQuery')}
              </Button>
            )}
          </div>
          {attribution}
        </div>
      ) : null}

      {search.data !== undefined && items.length === 0 && hasMore ? (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <p className="text-caption text-text-muted">{t(SEARCH_COPY_KEYS.interimEmpty)}</p>
          <div className="flex justify-center">
            <Button
              variant="secondary"
              className="min-h-11 min-w-11"
              aria-busy={search.isFetchingNextPage}
              disabled={search.isFetchingNextPage}
              onClick={handleLoadMore}
            >
              {t('search.actions.loadMore')}
            </Button>
          </div>
          {attribution}
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-title text-text">
              {t('search.results.heading', { query: query.trimmed })}
            </h2>
            <p className="text-caption text-text-muted tabular-nums">
              {t(items.length === 1 ? 'search.results.count_one' : 'search.results.count_other', {
                count: items.length,
              })}
            </p>
            {meta?.stale === true || refreshFailedWithItems ? (
              <p className="text-caption text-warning">
                {meta === undefined
                  ? null
                  : t(SEARCH_COPY_KEYS.stale, {
                      date: formatUpdatedAt(meta.lastUpdatedAt, language),
                    })}
              </p>
            ) : null}
          </div>

          {refreshFailedWithItems ? (
            <div role="alert" className="rounded-card border border-border bg-surface p-4">
              <p className="text-caption text-text-muted">
                {t(searchStateCopyKeys(uiState).description)}
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                disabled={search.isFetching}
                onClick={() => {
                  if (!search.isFetching) {
                    void search.refetch()
                  }
                }}
              >
                {retryLabel}
              </Button>
            </div>
          ) : null}

          <CatalogGrid label={collectionLabel}>
            {items.map((item) => (
              <li key={item.id}>
                <CatalogCard item={item} from={searchOrigin} />
              </li>
            ))}
          </CatalogGrid>

          {loadedPageHadNoTitles ? (
            <p className="text-caption text-text-muted">{t(SEARCH_COPY_KEYS.interimEmpty)}</p>
          ) : null}

          {pageError ? (
            <div role="alert" className="rounded-card border border-border bg-surface p-4">
              <p className="text-body font-semibold text-text">
                {t(SEARCH_COPY_KEYS.pageError.title)}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {t(SEARCH_COPY_KEYS.pageError.description)}
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                disabled={search.isFetchingNextPage}
                onClick={handleLoadMore}
              >
                {retryLabel}
              </Button>
            </div>
          ) : null}

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                className="min-h-11 min-w-11"
                aria-busy={search.isFetchingNextPage}
                disabled={search.isFetchingNextPage}
                onClick={handleLoadMore}
              >
                {t('search.actions.loadMore')}
              </Button>
            </div>
          ) : (
            <p
              ref={endStatusRef}
              tabIndex={-1}
              className="text-center text-caption text-text-muted"
            >
              {t(SEARCH_COPY_KEYS.endOfResults, { query: query.trimmed })}
            </p>
          )}

          {attribution}
        </>
      ) : null}
    </div>
  )
}
