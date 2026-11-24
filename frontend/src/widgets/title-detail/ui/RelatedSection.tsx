import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { RelatedTitles } from '@/entities/catalog'
import type { CatalogItem } from '@/entities/catalog'
import { Button, Skeleton } from '@/shared/ui'

export type RelatedSurfaceStatus = 'loading' | 'loaded' | 'error' | 'stale'

export interface RelatedSectionState {
  readonly status: RelatedSurfaceStatus
  readonly items?: readonly CatalogItem[]
  readonly onRetry: () => void
  readonly lastUpdatedLabel?: string
}

export interface RelatedSectionProps {
  readonly label: string
  readonly related: RelatedSectionState
}

export const RelatedSection = ({ label, related }: RelatedSectionProps) => {
  const { t } = useTranslation()
  const headingId = useId()

  if (related.status === 'error') {
    return (
      <section role="alert" className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-title text-text">{label}</h2>
        <p className="mt-stack font-semibold text-text">{t('detail.states.sectionError.title')}</p>
        <p className="mt-stack max-w-prose text-text-muted">
          {t('detail.states.sectionError.description')}
        </p>
        <Button type="button" className="mt-3" onClick={related.onRetry}>
          {t('detail.states.retry')}
        </Button>
      </section>
    )
  }

  if (related.status === 'loading' || related.items === undefined) {
    return (
      <section aria-busy="true" aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId} className="text-title text-text">
          {label}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="aspect-[2/3] w-full" />
        </div>
      </section>
    )
  }

  if (related.items.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-title text-text">
        {label}
      </h2>
      {related.status === 'stale' && related.lastUpdatedLabel !== undefined ? (
        <p className="text-caption text-text-muted">
          {t('detail.states.sectionStale')}. {related.lastUpdatedLabel}
        </p>
      ) : null}
      <RelatedTitles items={related.items} label={label} />
    </section>
  )
}
