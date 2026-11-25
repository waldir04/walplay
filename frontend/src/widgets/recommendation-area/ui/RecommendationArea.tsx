import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { resolveInterfaceLanguage, useSectionPreviewQuery } from '@/entities/catalog'
import type { InterfaceLanguage } from '@/entities/catalog'
import { savedIdentity, useSavedLibrary } from '@/entities/saved-library'
import type { SavedEntry } from '@/entities/saved-library'
import { getAppConfig } from '@/shared/config/env'
import { Button, Link, LiveRegion } from '@/shared/ui'
import { ProviderAttribution } from '@/widgets/provider-attribution'

import {
  RECOMMENDATION_DEFAULT_MEDIA_TYPE,
  RECOMMENDATION_FALLBACK_SECTION,
  RECOMMENDATION_STATE_COPY_KEYS,
} from '../model/constants'
import type { RecommendationMediaScope, RecommendationSectionState } from '../model/constants'
import { deriveRecommendationAreaView } from '../model/recommendationView'
import { RecommendationExplanation } from './RecommendationExplanation'
import { RecommendationMediaScope as RecommendationMediaScopeControl } from './RecommendationMediaScope'
import { RecommendationSection } from './RecommendationSection'
import { RecommendationSkeleton } from './RecommendationSkeleton'

const buildSavedIdentities = (
  watchlist: readonly SavedEntry[],
  favorites: readonly SavedEntry[]
): Set<string> => {
  const identities = new Set<string>()
  for (const entry of [...watchlist, ...favorites]) {
    identities.add(savedIdentity(entry.mediaType, entry.itemId))
  }
  return identities
}

const announcementKeyFor = (section: RecommendationSectionState): string | null => {
  switch (section.kind) {
    case 'loading':
      return null
    case 'ready':
      return `ready:${section.mediaScope}:${section.stale ? 'stale' : 'fresh'}`
    case 'empty':
      return `empty:${section.cause}`
    case 'error':
      return `error:${section.cause}`
  }
}

const announcementCopyKey = (section: RecommendationSectionState): string => {
  if (section.kind === 'ready') {
    return section.stale
      ? 'recommendations.announcements.stale'
      : 'recommendations.announcements.ready'
  }
  if (section.kind === 'empty') {
    return 'recommendations.announcements.empty'
  }
  return 'recommendations.announcements.error'
}

const RecommendationAreaContent = () => {
  const { t, i18n } = useTranslation()
  const [mediaScope, setMediaScope] = useState<RecommendationMediaScope>(
    RECOMMENDATION_DEFAULT_MEDIA_TYPE
  )
  const [isRetrying, setIsRetrying] = useState(false)
  const savedLibrary = useSavedLibrary()
  const language: InterfaceLanguage = resolveInterfaceLanguage(i18n.language)
  const query = useSectionPreviewQuery(mediaScope, RECOMMENDATION_FALLBACK_SECTION, language)
  const items = query.data?.data.items ?? []
  const meta = query.data?.meta
  const status = isRetrying
    ? 'error'
    : query.isPending
      ? 'pending'
      : query.isError
        ? 'error'
        : 'success'
  const savedIdentities = buildSavedIdentities(savedLibrary.watchlist, savedLibrary.favorites)
  const view = deriveRecommendationAreaView({
    enabled: true,
    mediaScope,
    savedIdentities,
    queryState: { status, rawItemCount: items.length, error: query.error },
    items,
    ...(meta === undefined ? {} : { meta }),
  })
  const section = view.section
  const isBusy = section.kind === 'loading' || isRetrying
  const headingId = useId()

  const announcementKey = announcementKeyFor(section)
  const announcedKey = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (announcementKey === null || announcedKey.current === announcementKey) {
      return
    }
    announcedKey.current = announcementKey
    setAnnouncement(t(announcementCopyKey(section)))
  }, [announcementKey, section, t])

  const handleRetry = (): void => {
    setIsRetrying(true)
    void query.refetch().finally(() => setIsRetrying(false))
  }

  const handleMediaScopeChange = (scope: RecommendationMediaScope): void => {
    setIsRetrying(false)
    setMediaScope(scope)
  }

  return (
    <section aria-labelledby={headingId} aria-busy={isBusy} className="flex min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-2">
        <h2 id={headingId} className="text-title text-text">
          {t('recommendations.area.heading')}
        </h2>
        <p className="max-w-prose text-text-muted">{t('recommendations.area.description')}</p>
        <RecommendationExplanation />
      </header>

      <RecommendationMediaScopeControl value={mediaScope} onChange={handleMediaScopeChange} />

      {section.kind === 'loading' ? (
        <>
          <p className="sr-only">{t(RECOMMENDATION_STATE_COPY_KEYS.loading)}</p>
          <RecommendationSkeleton />
        </>
      ) : null}

      {section.kind === 'error' ? (
        <div role="alert" className="rounded-card border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text">
            {t(RECOMMENDATION_STATE_COPY_KEYS.error[section.cause].title)}
          </p>
          <p className="mt-1 max-w-prose text-caption text-text-muted">
            {t(RECOMMENDATION_STATE_COPY_KEYS.error[section.cause].description)}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-busy={isRetrying}
            >
              {t(isRetrying ? 'recommendations.actions.retrying' : 'recommendations.actions.retry')}
            </Button>
            <Link to="/browse" className="min-h-11 px-1">
              {t('recommendations.actions.browse')}
            </Link>
          </div>
        </div>
      ) : null}

      {section.kind === 'ready' || section.kind === 'empty' ? (
        <RecommendationSection state={section} mediaScope={mediaScope} language={language} />
      ) : null}

      {section.kind === 'ready' ? <ProviderAttribution /> : null}

      <LiveRegion message={announcement} politeness="polite" />
    </section>
  )
}

export const RecommendationArea = () =>
  getAppConfig().recommendationsEnabled ? <RecommendationAreaContent /> : null
