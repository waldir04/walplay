import { useTranslation } from 'react-i18next'

import { CastList, CrewList } from '@/entities/catalog'
import type { Credits } from '@/entities/catalog'
import { Button, Skeleton } from '@/shared/ui'

export type CreditsSurfaceStatus = 'loading' | 'loaded' | 'error' | 'stale'

export interface CreditsSectionState {
  readonly status: CreditsSurfaceStatus
  readonly data?: Credits
  readonly onRetry: () => void
  readonly lastUpdatedLabel?: string
}

export interface CreditsSectionProps {
  readonly credits: CreditsSectionState
}

export const CreditsSection = ({ credits }: CreditsSectionProps) => {
  const { t } = useTranslation()

  if (credits.status === 'error') {
    return (
      <section role="alert" className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-title text-text">{t('detail.states.sectionError.title')}</h2>
        <p className="mt-stack max-w-prose text-text-muted">
          {t('detail.states.sectionError.description')}
        </p>
        <Button type="button" className="mt-3" onClick={credits.onRetry}>
          {t('detail.states.retry')}
        </Button>
      </section>
    )
  }

  if (credits.status === 'loading' || credits.data === undefined) {
    return (
      <section
        aria-busy="true"
        aria-label={t('detail.states.sectionLoading')}
        className="flex flex-col gap-2"
      >
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="aspect-[2/3] w-full" />
        </div>
      </section>
    )
  }

  const { cast, crew } = credits.data
  if (cast.length === 0 && crew.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-section">
      {credits.status === 'stale' && credits.lastUpdatedLabel !== undefined ? (
        <p className="text-caption text-text-muted">
          {t('detail.states.sectionStale')}. {credits.lastUpdatedLabel}
        </p>
      ) : null}

      {cast.length === 0 ? null : (
        <section aria-labelledby="detail-cast-heading" className="flex flex-col gap-3">
          <h2 id="detail-cast-heading" className="text-title text-text">
            {t('detail.sections.cast')}
          </h2>
          <CastList cast={cast} />
        </section>
      )}

      {crew.length === 0 ? null : (
        <section aria-labelledby="detail-crew-heading" className="flex flex-col gap-3">
          <h2 id="detail-crew-heading" className="text-title text-text">
            {t('detail.sections.crew')}
          </h2>
          <CrewList crew={crew} />
        </section>
      )}
    </div>
  )
}
