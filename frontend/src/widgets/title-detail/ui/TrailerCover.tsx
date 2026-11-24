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
import {
  TRAILER_PLATFORM_NAME,
  TRAILER_PLATFORM_PRIVACY_URL,
  TRAILER_PLATFORM_TERMS_URL,
} from '@/shared/config/trailerPlatform'

interface TrailerExternalLinkProps {
  readonly video: TrailerVideo
  readonly className?: string
}

export const TrailerExternalLink = ({ video, className }: TrailerExternalLinkProps) => {
  const { t } = useTranslation()
  if (video.externalUrl === undefined) {
    return null
  }
  const platform = video.platformName
  return (
    <a
      href={video.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t('detail.trailers.external.action', { platform })}. ${t(
        'detail.trailers.external.leaves'
      )}. ${t('detail.trailers.external.newTab')}`}
      className={`inline-flex min-h-11 w-fit max-w-full flex-col justify-center break-words rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
        className ?? ''
      }`}
    >
      <span className="break-words">{t('detail.trailers.external.action', { platform })}</span>
      <span className="text-caption font-normal text-text-muted">
        {t('detail.trailers.external.leaves')}. {t('detail.trailers.external.newTab')}
      </span>
    </a>
  )
}

export const TrailerDisclosure = () => {
  const { t } = useTranslation()
  const platform = TRAILER_PLATFORM_NAME
  return (
    <div className="flex max-w-prose flex-col gap-1 text-caption text-text-muted">
      <p>{t('detail.trailers.disclosure.loads', { platform })}</p>
      <p>{t('detail.trailers.disclosure.hostingNote')}</p>
      <p>{t('detail.trailers.disclosure.privacyNote')}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        <li>
          <a
            href={TRAILER_PLATFORM_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('detail.trailers.disclosure.terms', { platform })}
            <span className="sr-only">. {t('detail.trailers.external.newTab')}</span>
          </a>
        </li>
        <li>
          <a
            href={TRAILER_PLATFORM_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('detail.trailers.disclosure.privacy', { platform })}
            <span className="sr-only">. {t('detail.trailers.external.newTab')}</span>
          </a>
        </li>
      </ul>
    </div>
  )
}

export interface TrailerCoverProps {
  readonly video: TrailerVideo
  readonly onPlay: (video: TrailerVideo) => void
}

export const TrailerCover = ({ video, onPlay }: TrailerCoverProps) => {
  const { t, i18n } = useTranslation()
  const language = resolveInterfaceLanguage(i18n.language)
  const locale = toLocaleCode(language)
  const languageLabel = formatTrailerLanguage(video.language, locale)
  const published = formatTrailerPublishedAt(video.publishedAt, locale)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface-raised p-4">
      <p className="text-caption uppercase tracking-wide text-text-muted">
        {t(trailerTypeLabelKey(video.type))}
      </p>
      <p className="min-w-0 break-words text-title text-text">{video.title}</p>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-text-muted">
        <span>{video.platformName}</span>
        <span>{t('detail.trailers.list.selectedState')}</span>
        {video.official ? <span>{t('detail.trailers.list.official')}</span> : null}
        {languageLabel === undefined ? null : (
          <span>{t('detail.trailers.list.language', { language: languageLabel })}</span>
        )}
        {published === undefined ? null : (
          <span>{t('detail.trailers.list.published', { date: published })}</span>
        )}
      </p>
      <p className="text-caption text-text-muted">{t('detail.trailers.mode.embedded')}</p>
      <TrailerDisclosure />
      <div className="flex flex-wrap items-start gap-3">
        <Button type="button" onClick={() => onPlay(video)}>
          {t('detail.trailers.list.play', { title: video.title })}
        </Button>
        <TrailerExternalLink video={video} />
      </div>
    </div>
  )
}
