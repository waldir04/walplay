import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { DetailCapabilities } from '@/shared/config/detailCapabilities'

import { DetailFacts, DetailHero, DetailOverview } from '@/entities/catalog'
import type { Season, TitleDetail } from '@/entities/catalog'

import { CreditsSection } from './CreditsSection'
import { DetailActions } from './DetailActions'
import type { CreditsSectionState } from './CreditsSection'
import { ProviderMetadata } from './ProviderMetadata'
import { RelatedSection } from './RelatedSection'
import type { RelatedSectionState } from './RelatedSection'
import { SeasonEpisodesSection } from './SeasonEpisodesSection'
import type { SeasonSectionState } from './SeasonEpisodesSection'

export interface DetailStaleNote {
  readonly lastUpdatedLabel: string
}

export interface TitleDetailSeasonProps {
  readonly seasons: readonly Season[]
  readonly selectedSeason: number
  readonly onSelectSeason: (seasonNumber: number) => void
  readonly season: SeasonSectionState
  readonly announcement: string
  readonly busy: boolean
}

export interface TitleDetailViewProps {
  readonly detail: TitleDetail
  readonly returnAction: ReactNode
  readonly attribution: ReactNode
  readonly availability?: ReactNode | undefined
  readonly stale?: DetailStaleNote | undefined
  readonly season?: TitleDetailSeasonProps | undefined
  readonly credits?: CreditsSectionState | undefined
  readonly similar?: RelatedSectionState | undefined
  readonly collection?: RelatedSectionState | undefined
  readonly capabilities?: DetailCapabilities | undefined
}

export const TitleDetailView = ({
  detail,
  returnAction,
  attribution,
  availability,
  stale,
  season,
  credits,
  similar,
  collection,
  capabilities,
}: TitleDetailViewProps) => {
  const { t } = useTranslation()
  const mediaTypeLabel = t(`catalog.mediaType.${detail.mediaType}`)

  return (
    <div className="flex flex-col gap-section">
      {stale === undefined ? null : (
        <p
          role="status"
          className="rounded-control border border-border bg-surface-raised px-3 py-2 text-caption text-text-muted"
        >
          <span className="font-semibold text-text">{t('detail.states.stale.label')}. </span>
          {stale.lastUpdatedLabel}
        </p>
      )}

      <DetailHero
        detail={detail}
        mediaTypeLabel={mediaTypeLabel}
        originalTitleLabel={t('detail.facts.originalTitle')}
        returnAction={returnAction}
      />
      <DetailFacts detail={detail} />
      <DetailOverview detail={detail} />
      <DetailActions detail={detail} capabilities={capabilities} />
      {availability === undefined ? null : availability}
      {detail.mediaType === 'tv' && season !== undefined && season.seasons.length > 0 ? (
        <SeasonEpisodesSection
          seasons={season.seasons}
          selectedSeason={season.selectedSeason}
          onSelectSeason={season.onSelectSeason}
          season={season.season}
          announcement={season.announcement}
          busy={season.busy}
        />
      ) : null}
      {credits === undefined ? null : <CreditsSection credits={credits} />}
      {similar === undefined ? null : (
        <RelatedSection label={t('detail.sections.similar')} related={similar} />
      )}
      {detail.mediaType === 'movie' && collection !== undefined ? (
        <RelatedSection label={t('detail.sections.collection')} related={collection} />
      ) : null}
      <ProviderMetadata popularity={detail.popularity} attribution={attribution} />
    </div>
  )
}
