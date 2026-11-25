import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatLastUpdated,
  rankTrailerVideos,
  resolveInterfaceLanguage,
  toLocaleCode,
} from '@/entities/catalog'
import type { TrailerMeta, TrailerVideo, TrailersData } from '@/entities/catalog'
import { useEmbedWidth, useTrailerPlayback } from '@/features/play-trailer'
import { LiveRegion, Skeleton } from '@/shared/ui'

import { TrailerCover, TrailerDisclosure, TrailerExternalLink } from './TrailerCover'
import { TrailerList } from './TrailerList'
import { TrailerPlayer } from './TrailerPlayer'

export const TRAILER_SECTION_HEADING_ID = 'trailer-heading'

export type TrailerSectionStatus = 'loading' | 'error' | 'ready' | 'stale'

export interface TrailerSectionState {
  readonly status: TrailerSectionStatus
  readonly data?: TrailersData | undefined
  readonly meta?: TrailerMeta | undefined
  readonly onRetry: () => void
  readonly retrying?: boolean | undefined
}

export interface TrailerSectionProps {
  readonly state: TrailerSectionState
  readonly headingId?: string
}

const LoadingSkeleton = () => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <p className="sr-only">{t('detail.trailers.states.loading')}</p>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

const StaleNote = ({ meta }: { readonly meta: TrailerMeta }) => {
  const { t, i18n } = useTranslation()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const checked = formatLastUpdated(meta.lastUpdatedAt, locale) ?? meta.lastUpdatedAt
  return (
    <div
      role="status"
      className="rounded-control border border-border bg-surface-raised p-3 text-caption text-text-muted"
    >
      <p className="font-semibold text-text">
        {t('detail.trailers.states.stale.lastChecked', { date: checked })}
      </p>
      <p className="mt-1">{t('detail.trailers.states.stale.caution')}</p>
    </div>
  )
}

const ExternalOnlyPanel = ({ video }: { readonly video: TrailerVideo }) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-raised p-4">
      <p className="font-semibold text-text">{t('detail.trailers.externalOnly.title')}</p>
      <p className="max-w-prose text-body text-text-muted">
        {t('detail.trailers.externalOnly.description', { platform: video.platformName })}
      </p>
      <TrailerExternalLink video={video} />
    </div>
  )
}

const UnavailablePanel = ({ video }: { readonly video: TrailerVideo }) => {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface-raised p-4"
    >
      <p className="font-semibold text-text">{t('detail.trailers.unavailable.title')}</p>
      <p className="max-w-prose text-body text-text-muted">
        {t('detail.trailers.unavailable.description')}
      </p>
      <TrailerExternalLink video={video} />
    </div>
  )
}

const playbackAnnouncement = (
  t: (key: string, options?: Record<string, unknown>) => string,
  announcement: ReturnType<typeof useTrailerPlayback>['announcement']
): string => {
  if (announcement === null) {
    return ''
  }
  switch (announcement.kind) {
    case 'selected':
      return t('detail.trailers.announce.selected', {
        title: announcement.video.title,
        platform: announcement.video.platformName,
      })
    case 'ready':
      return t('detail.trailers.player.ready', {
        title: announcement.video.title,
        platform: announcement.video.platformName,
      })
    case 'unavailable':
      return t('detail.trailers.announce.unavailable')
    case 'external-only':
      return t('detail.trailers.announce.externalOnly')
  }
}

interface TrailerInventoryProps {
  readonly data: TrailersData & { readonly state: 'available' }
  readonly meta: TrailerMeta | undefined
  readonly stale: boolean
}

const TrailerInventory = ({ data, meta, stale }: TrailerInventoryProps) => {
  const { t, i18n } = useTranslation()
  const language = resolveInterfaceLanguage(i18n.language)
  const ranked = rankTrailerVideos(data.videos, language)
  const embed = useEmbedWidth()
  const playback = useTrailerPlayback({ videos: ranked, canEmbed: embed.canEmbed })
  const selected = playback.selectedVideo
  const active = playback.activeVideo
  const playing = playback.status === 'loading' || playback.status === 'ready'
  const message = playbackAnnouncement(t, playback.announcement)
  const mediaRef = useRef<HTMLDivElement | null>(null)
  const lastFocusKey = useRef('idle:')

  useEffect(() => {
    const key = `${playback.status}:${active?.id ?? ''}`
    if (lastFocusKey.current === key) {
      return
    }
    lastFocusKey.current = key
    if (
      playback.status === 'loading' ||
      playback.status === 'unavailable' ||
      playback.status === 'external-only'
    ) {
      mediaRef.current?.focus()
    }
  }, [playback.status, active?.id])

  return (
    <div ref={embed.ref} className="flex min-w-0 flex-col gap-4">
      {stale && meta !== undefined ? <StaleNote meta={meta} /> : null}

      <div
        ref={mediaRef}
        tabIndex={-1}
        className="flex min-w-0 flex-col gap-2 rounded-card focus:outline-2 focus:outline-offset-2 focus:outline-focus"
      >
        {selected === undefined ? null : !embed.canEmbed || playback.status === 'external-only' ? (
          <ExternalOnlyPanel video={selected} />
        ) : playback.status === 'unavailable' ? (
          <UnavailablePanel video={selected} />
        ) : active !== undefined && playing ? (
          <div className="flex min-w-0 flex-col gap-2">
            <TrailerPlayer
              video={active}
              canEmbed={embed.canEmbed}
              status={playback.status === 'ready' ? 'ready' : 'loading'}
              onLoad={playback.onFrameLoad}
            />
            <TrailerExternalLink video={active} />
          </div>
        ) : (
          <TrailerCover video={selected} onPlay={playback.activate} />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <TrailerDisclosure />
        <TrailerList
          videos={ranked}
          selectedId={selected?.id}
          playingVideoId={playing && active !== undefined ? active.id : null}
          onSelect={playback.activate}
        />
      </div>

      <LiveRegion message={t('detail.trailers.announce.inventoryLoaded')} />
      <LiveRegion message={message} />
    </div>
  )
}

export const TrailerSection = ({
  state,
  headingId = TRAILER_SECTION_HEADING_ID,
}: TrailerSectionProps) => {
  const { t } = useTranslation()
  const [retryAnnouncement, setRetryAnnouncement] = useState('')
  const data = state.data
  const available = data !== undefined && data.state === 'available' ? data : undefined

  const handleRetry = (): void => {
    if (state.retrying === true) {
      return
    }
    setRetryAnnouncement(t('detail.trailers.announce.retry'))
    state.onRetry()
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={state.status === 'loading'}
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 id={headingId} tabIndex={-1} className="text-title text-text">
        {t('detail.trailers.heading')}
      </h2>

      {state.status === 'loading' ? <LoadingSkeleton /> : null}

      {state.status === 'error' ? (
        <div role="alert" className="rounded-control border border-border bg-surface-raised p-4">
          <p className="font-semibold text-text">{t('detail.trailers.states.error.title')}</p>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('detail.trailers.states.error.description')}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={state.retrying === true}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {t('detail.trailers.states.error.retry')}
          </button>
        </div>
      ) : null}

      {state.status !== 'loading' && state.status !== 'error' && data?.state === 'no-videos' ? (
        <div
          role="status"
          className="rounded-control border border-border bg-surface-raised p-4 text-text"
        >
          <p className="font-semibold">{t('detail.trailers.states.noVideos.title')}</p>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('detail.trailers.states.noVideos.description')}
          </p>
        </div>
      ) : null}

      {state.status !== 'loading' && state.status !== 'error' && available !== undefined ? (
        <p className="sr-only">{t('detail.trailers.states.loaded')}</p>
      ) : null}

      {state.status !== 'loading' && state.status !== 'error' && available !== undefined ? (
        <TrailerInventory
          data={available}
          meta={state.meta}
          stale={state.status === 'stale' || state.meta?.stale === true}
        />
      ) : null}

      <LiveRegion message={retryAnnouncement} />
    </section>
  )
}
