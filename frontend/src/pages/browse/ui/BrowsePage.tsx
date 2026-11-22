import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

import {
  CatalogCardSkeleton,
  isInterfaceLanguage,
  parseCatalogPath,
  useCapabilitiesQuery,
} from '@/entities/catalog'
import type { SectionId } from '@/entities/catalog'
import { MediaTypeSwitch } from '@/features/switch-catalog-media'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { Button } from '@/shared/ui'
import { CatalogSectionPreview } from '@/widgets/catalog-section-preview'
import type { PreviewStatus } from '@/widgets/catalog-section-preview'
import { ProviderAttribution } from '@/widgets/provider-attribution'

export const BrowsePage = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const queryClient = useQueryClient()
  const parsed = parseCatalogPath(location.pathname)
  const mediaType = parsed.kind === 'landing' ? parsed.mediaType : 'movie'
  const language = isInterfaceLanguage(i18n.language) ? i18n.language : 'en'
  const capabilities = useCapabilitiesQuery()
  const [statuses, setStatuses] = useState<Partial<Record<SectionId, PreviewStatus>>>({})
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setStatuses({})
    setAttempt(0)
  }, [mediaType])

  const onStatusChange = useCallback((section: SectionId, status: PreviewStatus) => {
    setStatuses((current) =>
      current[section] === status ? current : { ...current, [section]: status }
    )
  }, [])

  const supportedSections = (capabilities.data?.data.sections ?? [])
    .filter((capability) => capability.mediaTypes.includes(mediaType))
    .sort((left, right) => left.order - right.order)

  const allFailed =
    supportedSections.length > 0 &&
    supportedSections.every((section) => statuses[section.id] === 'error')

  const retryAll = (): void => {
    setStatuses({})
    setAttempt((current) => current + 1)
    void queryClient.invalidateQueries({ queryKey: ['catalog', 'section', mediaType] })
  }

  const mediaTypeLabel = t(`catalog.mediaType.${mediaType}`)

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-stack">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t('catalog.landing.heading', { mediaType: mediaTypeLabel })}
        </h1>
        <MediaTypeSwitch current={mediaType} />
      </div>

      {capabilities.isPending ? (
        <div
          aria-busy="true"
          aria-label={t('catalog.states.loading')}
          className="flex flex-col gap-section"
        >
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-3">
              <div className="h-8 w-40 rounded-control bg-surface-subtle" aria-hidden="true" />
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 5 }, (_, itemIndex) => (
                  <li key={itemIndex}>
                    <CatalogCardSkeleton />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {capabilities.isError ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-title text-text">{t('catalog.states.pageError.title')}</h2>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('catalog.states.pageError.description')}
          </p>
          <Button className="mt-4" onClick={() => void capabilities.refetch()}>
            {t('catalog.actions.retry')}
          </Button>
        </div>
      ) : null}

      {capabilities.isSuccess && allFailed ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-title text-text">{t('catalog.states.pageError.title')}</h2>
          <p className="mt-stack max-w-prose text-text-muted">
            {t('catalog.states.pageError.description')}
          </p>
          <Button className="mt-4" onClick={retryAll}>
            {t('catalog.actions.retry')}
          </Button>
        </div>
      ) : null}

      {capabilities.isSuccess && !allFailed ? (
        <div key={attempt} className="flex flex-col gap-section">
          {supportedSections.map((capability) => (
            <CatalogSectionPreview
              key={capability.id}
              mediaType={mediaType}
              capability={capability}
              language={language}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      ) : null}

      <ProviderAttribution />
    </div>
  )
}
