import { useTranslation } from 'react-i18next'

import { ExpandableText } from '@/shared/ui'
import { EPISODE_OVERVIEW_PREVIEW_CODE_POINTS } from '@/shared/config/constants'

import {
  formatEpisodeAirDate,
  formatMinutes,
  formatRatingAccessibleText,
  formatRatingValue,
} from '../../model/detailFormatting'
import { resolveInterfaceLanguage, toLocaleCode } from '../../model/catalogLanguage'
import type { Episode } from '../../model/titleDetail'

export interface EpisodeListProps {
  readonly episodes: readonly Episode[]
}

const episodeTitle = (
  episode: Episode,
  translate: (key: string, options?: Record<string, unknown>) => string
): string =>
  episode.name ?? translate('detail.episodes.episodeLabel', { number: episode.number ?? '' })

export const EpisodeList = ({ episodes }: EpisodeListProps) => {
  const { t, i18n } = useTranslation()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const translate = (key: string, options?: Record<string, unknown>) => t(key, options)

  if (episodes.length === 0) {
    return (
      <div role="status" className="rounded-card border border-border bg-surface p-6">
        <p className="text-body font-semibold text-text">{t('detail.episodes.empty.title')}</p>
        <p className="mt-stack max-w-prose text-text-muted">
          {t('detail.episodes.empty.description')}
        </p>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-4">
      {episodes.map((episode, index) => {
        const airDate = formatEpisodeAirDate(episode.airDate, locale)
        const runtime =
          episode.runtimeMinutes === undefined
            ? undefined
            : formatMinutes(episode.runtimeMinutes, locale, translate)

        return (
          <li
            key={`${episode.number ?? 'name'}-${index}`}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row"
          >
            {episode.still === undefined ? null : (
              <img
                src={episode.still.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="aspect-video w-full shrink-0 rounded-control object-cover sm:w-48"
              />
            )}
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                {episode.number === undefined ? null : (
                  <span className="rounded-control bg-surface-raised px-2 py-0.5 text-caption font-semibold text-text-muted tabular-nums">
                    {episode.number}
                  </span>
                )}
                <h3 className="text-body font-semibold text-text">{episodeTitle(episode, t)}</h3>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-muted">
                {airDate === undefined ? null : <span className="tabular-nums">{airDate}</span>}
                {runtime === undefined ? null : <span className="tabular-nums">{runtime}</span>}
              </div>
              {episode.rating === undefined ? null : (
                <p className="flex flex-wrap items-baseline gap-2 text-caption text-text">
                  <span className="tabular-nums">
                    {formatRatingValue(episode.rating.value, locale)} / {episode.rating.scale}
                  </span>
                  <span className="text-text-muted">{t('detail.rating.label')}</span>
                  <span className="sr-only">
                    {formatRatingAccessibleText(episode.rating, locale, translate)}
                  </span>
                </p>
              )}
              {episode.overview === undefined ? null : (
                <ExpandableText
                  text={episode.overview}
                  previewCodePoints={EPISODE_OVERVIEW_PREVIEW_CODE_POINTS}
                  showMoreLabel={t('detail.overview.showMore')}
                  showLessLabel={t('detail.overview.showLess')}
                />
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
