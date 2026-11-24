import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TrailerVideo } from '@/entities/catalog'
import { TRAILER_MAX_INVENTORY, TRAILER_MAX_VISIBLE } from '@/entities/catalog'
import { Button } from '@/shared/ui'

import { TrailerItem } from './TrailerItem'

export const TRAILER_LIST_ID = 'trailer-video-list'

export interface TrailerListProps {
  readonly videos: readonly TrailerVideo[]
  readonly selectedId: string | undefined
  readonly playingVideoId: string | null
  readonly onSelect: (video: TrailerVideo) => void
}

export const TrailerList = ({ videos, selectedId, playingVideoId, onSelect }: TrailerListProps) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const visibleCount = expanded ? TRAILER_MAX_INVENTORY : TRAILER_MAX_VISIBLE
  const visible = videos.slice(0, visibleCount)
  const hasMore = videos.length > TRAILER_MAX_VISIBLE

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ul
        id={TRAILER_LIST_ID}
        aria-label={t('detail.trailers.list.label')}
        className="flex flex-col gap-2"
      >
        {visible.map((video) => (
          <TrailerItem
            key={video.id}
            video={video}
            selected={video.id === selectedId}
            playing={video.id === playingVideoId}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {hasMore ? (
        <Button
          type="button"
          variant="secondary"
          aria-expanded={expanded}
          aria-controls={TRAILER_LIST_ID}
          onClick={() => setExpanded((current) => !current)}
          className="w-fit"
        >
          {expanded ? t('detail.trailers.list.collapse') : t('detail.trailers.list.expand')}
        </Button>
      ) : null}
    </div>
  )
}
