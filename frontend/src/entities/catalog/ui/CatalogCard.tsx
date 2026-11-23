import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/shared/ui'

import { buildCatalogItemAccessibleName, formatRatingValue } from '../model/catalogItem'
import type { CatalogItem } from '../model/catalogItem'
import { isInterfaceLanguage } from '../model/catalogLanguage'
import { titleDetailPath } from '../model/catalogSection'
import { PosterFallback } from './PosterFallback'

export interface CatalogCardProps {
  readonly item: CatalogItem
  readonly from?: string
  readonly showRating?: boolean
}

export const CatalogCard = ({ item, from, showRating = true }: CatalogCardProps) => {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const language = isInterfaceLanguage(i18n.language) ? i18n.language : 'en'
  const mediaTypeLabel = t(`catalog.mediaType.${item.mediaType}`)

  const accessibleName = buildCatalogItemAccessibleName(
    item,
    language === 'es' ? 'es-ES' : 'en-US',
    {
      mediaTypeLabel,
      ratingTemplate: (value) => t('catalog.card.ratingA11y', { value, scale: 10 }),
    },
    { includeRating: showRating }
  )

  const showPoster = item.poster !== undefined && !imageFailed

  return (
    <article className="flex w-full flex-col">
      <Link
        to={titleDetailPath(item.mediaType, item.id)}
        state={{ item, ...(from === undefined ? {} : { from }) }}
        aria-label={accessibleName}
        className="group flex flex-col gap-2 no-underline"
      >
        <span className="relative block overflow-hidden rounded-control">
          {showPoster && item.poster ? (
            <img
              src={item.poster.url}
              srcSet={
                item.poster.urlLarge
                  ? `${item.poster.url} 342w, ${item.poster.urlLarge} 780w`
                  : undefined
              }
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="aspect-[2/3] w-full rounded-control border border-border object-cover"
            />
          ) : (
            <PosterFallback title={item.title} mediaTypeLabel={mediaTypeLabel} />
          )}
        </span>
        <span className="flex flex-col gap-1">
          <span className="line-clamp-2 text-body font-semibold text-text group-hover:text-primary">
            {item.title}
          </span>
          <span className="text-caption text-text-muted">{mediaTypeLabel}</span>
          {item.releaseYear !== undefined ? (
            <span className="text-caption text-text-muted tabular-nums">{item.releaseYear}</span>
          ) : null}
          {showRating && item.rating !== undefined ? (
            <span className="text-caption text-text-muted tabular-nums">
              {t('catalog.card.ratingLabel', {
                value: formatRatingValue(item.rating.value, language === 'es' ? 'es-ES' : 'en-US'),
              })}
            </span>
          ) : null}
          {item.genres.length > 0 ? (
            <span className="line-clamp-1 text-caption text-text-muted">
              {item.genres.map((genre) => genre.name).join(' · ')}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}
