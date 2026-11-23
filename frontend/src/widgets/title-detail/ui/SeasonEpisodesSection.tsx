import type { SeasonEpisodes } from '@/entities/catalog'
import type { Season } from '@/entities/catalog'
import { EpisodeList } from '@/entities/catalog'
import { Button, LiveRegion, Skeleton } from '@/shared/ui'
import { useTranslation } from 'react-i18next'

import { SeasonSelector } from '@/features/select-season'

export type SeasonSurfaceStatus = 'loading' | 'loaded' | 'error' | 'stale'

export interface SeasonSectionState {
  readonly status: SeasonSurfaceStatus
  readonly data?: SeasonEpisodes
  readonly onRetry: () => void
  readonly lastUpdatedLabel?: string
}

export interface SeasonEpisodesSectionProps {
  readonly seasons: readonly Season[]
  readonly selectedSeason: number
  readonly onSelectSeason: (seasonNumber: number) => void
  readonly season: SeasonSectionState
  readonly announcement: string
  readonly busy: boolean
}

export const SeasonEpisodesSection = ({
  seasons,
  selectedSeason,
  onSelectSeason,
  season,
  announcement,
  busy,
}: SeasonEpisodesSectionProps) => {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="detail-seasons-heading" className="flex flex-col gap-3">
      <h2 id="detail-seasons-heading" className="text-title text-text">
        {t('detail.sections.seasons')}
      </h2>
      <SeasonSelector
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSelectSeason={onSelectSeason}
      />
      <LiveRegion message={announcement} />

      <section
        aria-labelledby="detail-episodes-heading"
        aria-busy={busy}
        className="mt-stack flex flex-col gap-3"
      >
        <h2 id="detail-episodes-heading" className="text-title text-text">
          {t('detail.sections.episodes')}
        </h2>

        {season.status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <p className="sr-only">{t('detail.episodes.loading')}</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : null}

        {season.status === 'stale' && season.lastUpdatedLabel !== undefined ? (
          <p className="text-caption text-text-muted">
            {t('detail.states.sectionStale')}. {season.lastUpdatedLabel}
          </p>
        ) : null}

        {season.status === 'error' ? (
          <div role="alert" className="rounded-card border border-border bg-surface p-4">
            <p className="font-semibold text-text">{t('detail.states.sectionError.title')}</p>
            <p className="mt-stack max-w-prose text-text-muted">
              {t('detail.states.sectionError.description')}
            </p>
            <Button type="button" className="mt-3" onClick={season.onRetry}>
              {t('detail.states.retry')}
            </Button>
          </div>
        ) : null}

        {season.data === undefined ? null : <EpisodeList episodes={season.data.episodes} />}
      </section>
    </section>
  )
}
