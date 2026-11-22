import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import {
  PosterFallback,
  buildCatalogItemAccessibleName,
  catalogItemSchema,
  formatRatingValue,
  isInterfaceLanguage,
  parseCatalogPath,
  stateCopyKeys,
  stateForError,
  useCatalogItemQuery,
} from '@/entities/catalog'
import type { CatalogItem, MediaType } from '@/entities/catalog'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Link } from '@/shared/ui'
import { ProviderAttribution } from '@/widgets/provider-attribution'

import { resolveDetailReturn } from './detailReturn'

interface DetailRouteState {
  readonly item?: unknown
  readonly from?: unknown
}

const readRoutedItem = (
  state: unknown,
  mediaType: MediaType,
  itemId: string
): CatalogItem | null => {
  if (state === null || typeof state !== 'object') {
    return null
  }
  const parsed = catalogItemSchema.safeParse((state as DetailRouteState).item)
  if (!parsed.success) {
    return null
  }
  if (parsed.data.id !== itemId || parsed.data.mediaType !== mediaType) {
    return null
  }
  return parsed.data
}

export const TitleDetailPage = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const parsed = parseCatalogPath(location.pathname)
  const language = isInterfaceLanguage(i18n.language) ? i18n.language : 'en'
  const isDetail = parsed.kind === 'detail'
  const mediaType: MediaType = parsed.kind === 'detail' ? parsed.mediaType : 'movie'
  const itemId = parsed.kind === 'detail' ? parsed.itemId : 'not-a-catalog-item'
  const routedItem = isDetail ? readRoutedItem(location.state, mediaType, itemId) : null
  const query = useCatalogItemQuery(mediaType, itemId, language, {
    enabled: isDetail && routedItem === null,
  })
  const item = routedItem ?? query.data?.data
  const returnTarget = resolveDetailReturn(mediaType, location.state)
  const mediaTypeLabel = t(`catalog.mediaType.${mediaType}`)

  if (!isDetail) {
    return null
  }

  const heading = item
    ? item.title
    : query.isError
      ? t('catalog.states.notFound.title')
      : t('catalog.states.loading')

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {heading}
        </h1>
        <Link to={returnTarget.path} className="min-h-11 w-fit px-1 text-caption">
          {returnTarget.isSearch
            ? t('catalog.actions.returnToSearch')
            : t('catalog.actions.returnToCatalog')}
        </Link>
      </div>

      {query.isPending && routedItem === null ? (
        <div
          aria-busy="true"
          aria-label={t('catalog.states.loading')}
          className="flex flex-col gap-4 md:flex-row"
        >
          <div
            className="aspect-[2/3] w-full max-w-56 rounded-control bg-surface-subtle"
            aria-hidden="true"
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-8 w-3/4 rounded-control bg-surface-subtle" aria-hidden="true" />
            <div className="h-4 w-1/2 rounded-control bg-surface-subtle" aria-hidden="true" />
            <div className="h-4 w-1/3 rounded-control bg-surface-subtle" aria-hidden="true" />
          </div>
        </div>
      ) : null}

      {query.isError && routedItem === null ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-title text-text">
            {t(stateCopyKeys(stateForError(query.error)).title)}
          </h2>
          <p className="mt-stack max-w-prose text-text-muted">
            {t(stateCopyKeys(stateForError(query.error)).description)}
          </p>
        </div>
      ) : null}

      {item ? (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="w-full max-w-56 shrink-0">
            {item.poster ? (
              <img
                src={item.poster.url}
                srcSet={
                  item.poster.urlLarge
                    ? `${item.poster.url} 342w, ${item.poster.urlLarge} 780w`
                    : undefined
                }
                sizes="(min-width: 768px) 224px, 60vw"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="aspect-[2/3] w-full rounded-control border border-border object-cover"
              />
            ) : (
              <PosterFallback title={item.title} mediaTypeLabel={mediaTypeLabel} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body text-text-muted">{mediaTypeLabel}</p>
            {item.releaseYear !== undefined ? (
              <p className="text-body text-text-muted tabular-nums">{item.releaseYear}</p>
            ) : null}
            {item.rating !== undefined ? (
              <p className="text-body text-text-muted tabular-nums">
                {t('catalog.card.ratingLabel', {
                  value: formatRatingValue(
                    item.rating.value,
                    language === 'es' ? 'es-ES' : 'en-US'
                  ),
                })}
              </p>
            ) : null}
            {item.genres.length > 0 ? (
              <p className="text-body text-text-muted">
                {item.genres.map((genre) => genre.name).join(' · ')}
              </p>
            ) : null}
            <p className="max-w-prose text-text">{t('catalog.states.detailsUnavailable')}</p>
            <p className="sr-only">
              {buildCatalogItemAccessibleName(item, language === 'es' ? 'es-ES' : 'en-US', {
                mediaTypeLabel,
                ratingTemplate: (value) => t('catalog.card.ratingA11y', { value, scale: 10 }),
              })}
            </p>
          </div>
        </div>
      ) : null}

      <ProviderAttribution />
    </div>
  )
}
