import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CATEGORY_LABEL_KEYS,
  CatalogGrid,
  CatalogCard,
  CatalogCardSkeleton,
  SECTION_LABEL_KEYS,
  categoryPath,
  stateCopyKeys,
  stateForError,
  useSectionPreviewQuery,
} from '@/entities/catalog'
import type { CatalogSectionCapability, InterfaceLanguage, MediaType } from '@/entities/catalog'
import { Link, Button } from '@/shared/ui'

export type PreviewStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface CatalogSectionPreviewProps {
  readonly mediaType: MediaType
  readonly capability: CatalogSectionCapability
  readonly language: InterfaceLanguage
  readonly onStatusChange?: (section: CatalogSectionCapability['id'], status: PreviewStatus) => void
}

const formatUpdatedAt = (value: string, language: InterfaceLanguage): string =>
  new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const categoryFor = (capability: CatalogSectionCapability) => {
  if (capability.id === 'popular' || capability.id === 'top-rated') {
    return capability.id
  }
  return undefined
}

export const CatalogSectionPreview = ({
  mediaType,
  capability,
  language,
  onStatusChange,
}: CatalogSectionPreviewProps) => {
  const { t } = useTranslation()
  const query = useSectionPreviewQuery(mediaType, capability.id, language)
  const items = query.data?.data.items ?? []
  const meta = query.data?.meta

  const status: PreviewStatus = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : items.length === 0
        ? 'empty'
        : 'ready'

  useEffect(() => {
    onStatusChange?.(capability.id, status)
  }, [capability.id, onStatusChange, status])

  const errorState = stateForError(query.error)
  const headingId = `catalog-section-${capability.id}`
  const sectionLabel = t(SECTION_LABEL_KEYS[capability.id])
  const category = categoryFor(capability)

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={query.isPending}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-title text-text">
          {sectionLabel}
        </h2>
        {capability.paginated && category ? (
          <Link
            to={categoryPath(mediaType, category)}
            className="min-h-11 px-1 text-caption"
            aria-label={t('catalog.actions.seeAll', {
              section: t(CATEGORY_LABEL_KEYS[category]),
            })}
          >
            {t('catalog.actions.seeAll', { section: t(CATEGORY_LABEL_KEYS[category]) })}
          </Link>
        ) : null}
      </div>

      {query.isPending ? (
        <ul
          aria-hidden="true"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index}>
              <CatalogCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}

      {query.isError ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text">
            {errorState === 'rate-limited' || errorState === 'timed-out'
              ? t(stateCopyKeys(errorState).title)
              : t('catalog.states.error.title')}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {errorState === 'rate-limited' || errorState === 'timed-out'
              ? t(stateCopyKeys(errorState).description)
              : t('catalog.states.error.description')}
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
            {t('catalog.actions.retry')}
          </Button>
        </div>
      ) : null}

      {!query.isPending && !query.isError && items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text">{t('catalog.states.empty.title')}</p>
          <p className="mt-1 text-caption text-text-muted">
            {t('catalog.states.empty.description')}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void query.refetch()}>
              {t('catalog.actions.retry')}
            </Button>
            <Link
              to={`/browse/${mediaType === 'movie' ? 'tv-shows' : 'movies'}`}
              className="min-h-11 px-1"
            >
              {t('catalog.actions.switchMediaType')}
            </Link>
          </div>
        </div>
      ) : null}

      {items.length > 0 && meta ? (
        <>
          {meta.stale ? (
            <p className="text-caption text-warning">
              {t('catalog.states.stale.lastUpdated', {
                date: formatUpdatedAt(meta.lastUpdatedAt, language),
              })}
            </p>
          ) : null}
          <CatalogGrid label={sectionLabel}>
            {items.map((item) => (
              <li key={item.id}>
                <CatalogCard item={item} />
              </li>
            ))}
          </CatalogGrid>
        </>
      ) : null}
    </section>
  )
}
