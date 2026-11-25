import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CatalogCard, CatalogGrid, LANGUAGE_TO_LOCALE } from '@/entities/catalog'
import type { InterfaceLanguage } from '@/entities/catalog'
import { Link } from '@/shared/ui'

import {
  RECOMMENDATION_MEDIA_SCOPE_LABEL_KEYS,
  RECOMMENDATION_STATE_COPY_KEYS,
} from '../model/constants'
import type { RecommendationMediaScope, RecommendationSectionState } from '../model/constants'

export interface RecommendationSectionProps {
  readonly state: Extract<RecommendationSectionState, { kind: 'ready' | 'empty' }>
  readonly mediaScope: RecommendationMediaScope
  readonly language: InterfaceLanguage
}

const formatUpdatedAt = (value: string, language: InterfaceLanguage): string =>
  new Intl.DateTimeFormat(LANGUAGE_TO_LOCALE[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const RecommendationSection = ({
  state,
  mediaScope,
  language,
}: RecommendationSectionProps) => {
  const { t } = useTranslation()
  const headingId = useId()
  const mediaTypeLabel = t(RECOMMENDATION_MEDIA_SCOPE_LABEL_KEYS[mediaScope])
  const accessibleName = t('recommendations.section.accessibleName', {
    mediaType: mediaTypeLabel,
  })

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <h3 id={headingId} className="min-w-0 text-title text-text">
        <span aria-hidden="true">{t('recommendations.section.popular.heading')}</span>
        <span className="sr-only">{accessibleName}</span>
      </h3>

      {state.kind === 'ready' ? (
        <>
          <p className="text-caption text-text-muted">
            {t('recommendations.section.popular.basis')}
          </p>
          {state.stale && state.lastUpdatedAt !== undefined ? (
            <div className="flex flex-col gap-1 text-caption text-warning">
              <span>{t(RECOMMENDATION_STATE_COPY_KEYS.stale.label)}</span>
              <span>
                {t(RECOMMENDATION_STATE_COPY_KEYS.stale.lastUpdated, {
                  date: formatUpdatedAt(state.lastUpdatedAt, language),
                })}
              </span>
            </div>
          ) : null}
          <CatalogGrid label={t('recommendations.section.listLabel')}>
            {state.items.map((view) => (
              <li key={`${view.item.mediaType}:${view.item.id}`} className="min-w-0">
                <CatalogCard item={view.item} />
              </li>
            ))}
          </CatalogGrid>
        </>
      ) : (
        <div
          role="status"
          className="flex min-w-0 flex-col items-start gap-3 rounded-card border border-border bg-surface p-4"
        >
          <p className="text-body font-semibold text-text">
            {t(RECOMMENDATION_STATE_COPY_KEYS.empty[state.cause].title)}
          </p>
          <p className="max-w-prose text-caption text-text-muted">
            {t(RECOMMENDATION_STATE_COPY_KEYS.empty[state.cause].description)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/browse" className="min-h-11 px-1">
              {t('recommendations.actions.browse')}
            </Link>
            <Link to="/search" className="min-h-11 px-1">
              {t('recommendations.actions.search')}
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
