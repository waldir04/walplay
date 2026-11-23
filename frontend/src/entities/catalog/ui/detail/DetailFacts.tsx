import { useTranslation } from 'react-i18next'

import { titleStatusLabelKey } from '../../model/titleDetail'
import type { TitleDetail } from '../../model/titleDetail'
import {
  formatDetailDateOrYear,
  formatEpisodeAirDate,
  formatEpisodeRuntime,
  formatMovieDuration,
  formatRatingAccessibleText,
  formatRatingValue,
  formatVoteCountText,
} from '../../model/detailFormatting'
import { resolveInterfaceLanguage, toLocaleCode } from '../../model/catalogLanguage'

export interface DetailFactsProps {
  readonly detail: TitleDetail
}

export const DetailFacts = ({ detail }: DetailFactsProps) => {
  const { t, i18n } = useTranslation()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const translate = (key: string, options?: Record<string, unknown>) => t(key, options)

  const dateLabel =
    detail.mediaType === 'movie' ? t('detail.facts.releaseDate') : t('detail.facts.firstAirDate')
  const dateValue = formatDetailDateOrYear(detail.releaseDate, detail.releaseYear, locale)
  const runtimeValue =
    detail.runtime === undefined
      ? undefined
      : formatMovieDuration(detail.runtime.minutes, locale, translate)
  const episodeRuntimeValue =
    detail.episodeRuntime === undefined
      ? undefined
      : formatEpisodeRuntime(detail.episodeRuntime, locale, translate)
  const statusLabel =
    detail.status === undefined ? undefined : t(titleStatusLabelKey(detail.status))
  const tvSummary = detail.tvSummary

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
      {dateValue === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{dateLabel}</dt>
          <dd className="text-text">{dateValue}</dd>
        </div>
      )}

      {detail.genres.length === 0 ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.genres')}</dt>
          <dd>
            <ul aria-label={t('detail.facts.genres')} className="flex flex-wrap gap-2">
              {detail.genres.map((genre) => (
                <li
                  key={genre.id}
                  className="rounded-control bg-surface-raised px-2 py-1 text-caption"
                >
                  {genre.name}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}

      {runtimeValue === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.runtime')}</dt>
          <dd className="text-text tabular-nums">{runtimeValue}</dd>
        </div>
      )}

      {episodeRuntimeValue === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.episodeRuntime')}</dt>
          <dd className="text-text tabular-nums">{episodeRuntimeValue}</dd>
        </div>
      )}

      {detail.rating === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.rating.label')}</dt>
          <dd className="flex flex-wrap items-baseline gap-2 text-text">
            <span className="tabular-nums">
              {formatRatingValue(detail.rating.value, locale)} / {detail.rating.scale}
            </span>
            <span className="text-caption text-text-muted tabular-nums">
              {formatVoteCountText(detail.rating.voteCount, locale, translate)}
            </span>
            <span className="sr-only">
              {formatRatingAccessibleText(detail.rating, locale, translate)}
            </span>
          </dd>
        </div>
      )}

      {statusLabel === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.status')}</dt>
          <dd className="text-text">{statusLabel}</dd>
        </div>
      )}

      {tvSummary?.seasonsCount === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.seasonsReported')}</dt>
          <dd className="text-text tabular-nums">{tvSummary.seasonsCount}</dd>
        </div>
      )}

      {tvSummary?.episodesCount === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.episodesReported')}</dt>
          <dd className="text-text tabular-nums">{tvSummary.episodesCount}</dd>
        </div>
      )}

      {tvSummary?.latestAirDate === undefined ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.latestAirDate')}</dt>
          <dd className="text-text tabular-nums">
            {formatEpisodeAirDate(tvSummary.latestAirDate, locale)}
          </dd>
        </div>
      )}

      {tvSummary?.networks === undefined || tvSummary.networks.length === 0 ? null : (
        <div>
          <dt className="text-caption text-text-muted">{t('detail.facts.networks')}</dt>
          <dd className="text-text">{tvSummary.networks.join(' · ')}</dd>
        </div>
      )}
    </dl>
  )
}
