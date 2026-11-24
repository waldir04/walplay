import { useTranslation } from 'react-i18next'

import type { TrailerVideo } from '@/entities/catalog'

export type TrailerPlayerStatus = 'loading' | 'ready'

export interface TrailerPlayerProps {
  readonly video: TrailerVideo
  readonly canEmbed: boolean
  readonly status: TrailerPlayerStatus
  readonly onLoad: (videoId: string) => void
}

export const TrailerPlayer = ({ video, canEmbed, status, onLoad }: TrailerPlayerProps) => {
  const { t } = useTranslation()

  if (!canEmbed || video.embedUrl === undefined) {
    return null
  }

  const statusText =
    status === 'ready'
      ? t('detail.trailers.player.ready', {
          title: video.title,
          platform: video.platformName,
        })
      : t('detail.trailers.player.loading', {
          title: video.title,
          platform: video.platformName,
        })

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-surface">
        <iframe
          key={video.id}
          src={video.embedUrl}
          title={t('detail.trailers.player.title', {
            title: video.title,
            platform: video.platformName,
          })}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="eager"
          onLoad={() => onLoad(video.id)}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <p className="text-caption text-text-muted">{statusText}</p>
      <p className="max-w-prose text-caption text-text-muted">
        {t('detail.trailers.player.captionNote', { platform: video.platformName })}
      </p>
    </div>
  )
}
