import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AVAILABILITY_CATEGORY_ORDER,
  AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID,
  formatAvailabilityTimestamp,
  formatRegionLabel,
  resolveInterfaceLanguage,
  toLocaleCode,
} from '@/entities/catalog'
import type {
  AvailabilityCategory,
  AvailabilityData,
  AvailabilityMeta,
  AvailabilityProvider,
} from '@/entities/catalog'
import { Button, Skeleton } from '@/shared/ui'

export type AvailabilitySectionStatus = 'loading' | 'ready' | 'error'

export interface AvailabilitySectionState {
  readonly status: AvailabilitySectionStatus
  readonly data?: AvailabilityData | undefined
  readonly meta?: AvailabilityMeta | undefined
  readonly onRetry: () => void
  readonly retrying?: boolean | undefined
}

export interface AvailabilitySectionProps {
  readonly region: string
  readonly state: AvailabilitySectionState
  readonly regionSelector?: ReactNode
  readonly attribution?: ReactNode
  readonly disclaimer?: ReactNode
}

const HEADING_ID = 'availability-heading'
const REGION_CONTEXT_ID = 'availability-region-context'

const destinationHost = (url: string): string | undefined => {
  try {
    return new URL(url).host
  } catch {
    return undefined
  }
}

const ProviderLogo = ({ logo }: { readonly logo: NonNullable<AvailabilityProvider['logo']> }) => {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return null
  }

  return (
    <img
      src={logo.url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={48}
      height={32}
      onError={() => setFailed(true)}
      className="h-8 w-12 shrink-0 object-contain"
    />
  )
}

export const AvailabilitySection = ({
  region,
  state,
  regionSelector,
  attribution,
  disclaimer,
}: AvailabilitySectionProps) => {
  const { t, i18n } = useTranslation()
  const locale = toLocaleCode(resolveInterfaceLanguage(i18n.language))
  const regionLabel = formatRegionLabel(region, locale)

  const categoryLabel = (category: AvailabilityCategory): string => {
    switch (category) {
      case 'subscription':
        return t('detail.availability.categories.subscription')
      case 'free':
        return t('detail.availability.categories.free')
      case 'ads':
        return t('detail.availability.categories.ads')
      case 'rent':
        return t('detail.availability.categories.rent')
      case 'buy':
        return t('detail.availability.categories.buy')
    }
  }

  const data = state.status === 'ready' ? state.data : undefined
  const meta = state.status === 'ready' ? state.meta : undefined
  const isUnsupported = data?.state === 'unsupported-region'
  const destination =
    data === undefined || data.state === 'unsupported-region' ? undefined : data.destination
  const host = destination === undefined ? undefined : destinationHost(destination.url)

  const checkedAt =
    meta === undefined ? undefined : formatAvailabilityTimestamp(meta.lastUpdatedAt, locale)
  const sourceUpdatedAt =
    meta?.sourceUpdatedAt === undefined
      ? undefined
      : formatAvailabilityTimestamp(meta.sourceUpdatedAt, locale)

  const freshnessLabel =
    meta === undefined
      ? undefined
      : sourceUpdatedAt !== undefined
        ? t('detail.availability.freshness.sourceUpdated', { date: sourceUpdatedAt })
        : checkedAt !== undefined
          ? t('detail.availability.freshness.checked', { date: checkedAt })
          : undefined

  return (
    <section
      aria-labelledby={HEADING_ID}
      aria-describedby={REGION_CONTEXT_ID}
      aria-busy={state.status === 'loading'}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <h2 id={HEADING_ID} className="text-title text-text">
        {t('detail.sections.availability')}
      </h2>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <p id={REGION_CONTEXT_ID} className="min-w-0 break-words text-body text-text">
          {t('detail.availability.regionLabel', { region: regionLabel })}
        </p>
        {regionSelector === undefined ? null : <div className="min-w-0">{regionSelector}</div>}
      </div>

      {state.status === 'loading' ? (
        <div className="flex flex-col gap-2">
          <p className="sr-only">{t('detail.availability.loading')}</p>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-8/12" />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div role="alert" className="rounded-control border border-border bg-surface-raised p-4">
          <p className="font-semibold text-text">{t('detail.availability.error.title')}</p>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('detail.availability.error.description')}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={state.onRetry}
            disabled={state.retrying}
          >
            {t('detail.availability.retry')}
          </Button>
        </div>
      ) : null}

      {meta?.stale === true ? (
        <div
          role="status"
          className="rounded-control border border-border bg-surface-raised p-4 text-caption text-text-muted"
        >
          <p className="font-semibold text-text">{t('detail.availability.freshness.lastKnown')}</p>
          <p>
            {t('detail.availability.freshness.lastChecked', {
              date: checkedAt ?? meta.lastUpdatedAt,
            })}
          </p>
          <p className="mt-1">{t('detail.availability.freshness.caution')}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={state.onRetry}
            disabled={state.retrying}
          >
            {t('detail.availability.retry')}
          </Button>
        </div>
      ) : null}

      {data?.state === 'available' ? (
        <div className="flex flex-col gap-3">
          {AVAILABILITY_CATEGORY_ORDER.map((category) => {
            const group = data.groups.find((candidate) => candidate.category === category)
            if (group === undefined) {
              return null
            }
            const groupHeadingId = `availability-group-${category}`
            return (
              <section
                key={category}
                aria-labelledby={groupHeadingId}
                className="flex flex-col gap-2"
              >
                <h3 id={groupHeadingId} className="text-body font-semibold text-text">
                  {categoryLabel(category)}
                </h3>
                <ul className="flex min-w-0 flex-wrap gap-2">
                  {group.providers.map((provider, index) => (
                    <li
                      key={`${provider.name}-${index}`}
                      className="flex min-w-0 items-center gap-2 rounded-control border border-border bg-surface-raised px-2 py-1"
                    >
                      {provider.logo === undefined ? null : <ProviderLogo logo={provider.logo} />}
                      <span className="min-w-0 break-words text-body text-text">
                        {provider.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : null}

      {data?.state === 'no-information' ? (
        <div
          role="status"
          className="rounded-control border border-border bg-surface-raised p-4 text-text"
        >
          <p className="font-semibold">{t('detail.availability.noInformation.title')}</p>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('detail.availability.noInformation.description', { region: regionLabel })}
          </p>
        </div>
      ) : null}

      {data?.state === 'unsupported-region' ? (
        <div
          role="status"
          className="rounded-control border border-border bg-surface-raised p-4 text-text"
        >
          <p className="font-semibold">{t('detail.availability.unsupportedRegion.title')}</p>
          <p
            id={AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID}
            className="mt-stack max-w-prose text-text-muted"
          >
            {t('detail.availability.regionUnsupported', { region: regionLabel })}
          </p>
        </div>
      ) : null}

      {freshnessLabel === undefined || isUnsupported ? null : (
        <p className="text-caption text-text-muted">{freshnessLabel}</p>
      )}

      {destination === undefined || host === undefined ? null : (
        <a
          href={destination.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-fit max-w-full flex-col justify-center rounded-control border border-border-strong bg-surface px-4 py-2 font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        >
          <span>{t('detail.availability.destination')}</span>
          <span className="text-caption font-normal text-text-muted">
            {t('detail.availability.destinationExternal', { host })}
          </span>
        </a>
      )}

      {data === undefined ? null : (
        <div className="max-w-prose text-caption text-text-muted">
          {disclaimer ?? <p>{t('detail.availability.disclaimer')}</p>}
        </div>
      )}

      {isUnsupported || state.status !== 'ready' || attribution === undefined ? null : (
        <div className="min-w-0">{attribution}</div>
      )}
    </section>
  )
}
