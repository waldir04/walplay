import { useTranslation } from 'react-i18next'

import {
  formatTrailerLanguage,
  formatTrailerPublishedAt,
  resolveInterfaceLanguage,
  toLocaleCode,
  trailerTypeLabelKey,
} from '@/entities/catalog'
import type { TrailerVideo } from '@/entities/catalog'
import { Button } from '@/shared/ui'

import { TrailerExternalLink } from './TrailerCover'

export interface TrailerItemProps {
  readonly video: TrailerVideo
  readonly selected: boolean
  readonly playing: boolean
  readonly onSelect: (video: TrailerVideo) => void
}

export const TrailerItem = ({ video, selected, playing, onSelect }: TrailerItemProps) => {
  const { t, i18n } = useTranslation()
  const language = resolveInterfaceLanguage(i18n.language)
  const locale = toLocaleCode(language)
  const languageLabel = formatTrailerLanguage(video.language, locale)
  const published = formatTrailerPublishedAt(video.publishedAt, locale)
  const mode =
    video.embedUrl === undefined
      ? t('detail.trailers.mode.external', { platform: video.platformName })
      : t('detail.trailers.mode.embedded')

  return (
    <li
      aria-current={selected ? 'true' : undefined}
      className="flex min-w-0 flex-col gap-2 rounded-control border border-border bg-surface p-3"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-caption uppercase tracking-wide text-text-muted">
          {t(trailerTypeLabelKey(video.type))}
        </p>
        <p className="min-w-0 break-words text-body font-semibold text-text">{video.title}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-text-muted">
          <span>{video.platformName}</span>
          {video.official ? <span>{t('detail.trailers.list.official')}</span> : null}
          {languageLabel === undefined ? null : (
            <span>{t('detail.trailers.list.language', { language: languageLabel })}</span>
          )}
          {published === undefined ? null : (
            <span>{t('detail.trailers.list.published', { date: published })}</span>
          )}
          {selected ? <span>{t('detail.trailers.list.selectedState')}</span> : null}
          {playing ? <span>{t('detail.trailers.list.playingState')}</span> : null}
        </p>
        <p className="text-caption text-text-muted">{mode}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-pressed={selected}
          onClick={() => onSelect(video)}
        >
          {t('detail.trailers.list.play', { title: video.title })}
        </Button>
        <TrailerExternalLink video={video} />
      </div>
    </li>
  )
}
