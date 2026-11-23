import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import {
  DetailFailure,
  DetailNotFound,
  DetailSkeleton,
  catalogItemSchema,
  detailStateForError,
  formatLastUpdated,
  parseCatalogPath,
  resolveInterfaceLanguage,
  toLocaleCode,
  useCollectionQuery,
  useCreditsQuery,
  useDetailQuery,
  useSeasonQuery,
  useSimilarQuery,
} from '@/entities/catalog'
import type { CatalogItem, DetailResponseMeta, MediaType } from '@/entities/catalog'
import { initialSeasonNumber, useSeasonSelection } from '@/features/select-season'
import type { DetailCapabilities } from '@/shared/config/detailCapabilities'
import { PAGE_HEADING_ID } from '@/shared/lib/domIds'
import { useDocumentTitleOverride } from '@/shared/lib/documentTitle'
import { Link, LiveRegion } from '@/shared/ui'
import { ProviderAttribution } from '@/widgets/provider-attribution'
import { TitleDetailView } from '@/widgets/title-detail'
import type {
  CreditsSectionState,
  RelatedSectionState,
  SeasonSectionState,
} from '@/widgets/title-detail'

import { resolveDetailReturn } from './detailReturn'

interface DetailRouteState {
  readonly item?: unknown
  readonly from?: unknown
}

const readRoutedItem = (
  state: unknown,
  mediaType: MediaType,
  itemId: string
): CatalogItem | null => {
  if (state === null || typeof state !== 'object') {
    return null
  }
  const parsed = catalogItemSchema.safeParse((state as DetailRouteState).item)
  if (!parsed.success) {
    return null
  }
  if (parsed.data.id !== itemId || parsed.data.mediaType !== mediaType) {
    return null
  }
  return parsed.data
}

const mediaTypeFromPath = (pathname: string): MediaType => {
  const [, mediaSlug] = pathname.split('/').filter(Boolean)
  return mediaSlug === 'tv-shows' ? 'tv' : 'movie'
}

const isStaleMeta = (meta: DetailResponseMeta | undefined): boolean =>
  meta !== undefined && (meta.stale || meta.source === 'stale-cache')

export interface TitleDetailPageProps {
  readonly capabilities?: DetailCapabilities
}

export const TitleDetailPage = ({ capabilities }: TitleDetailPageProps = {}) => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const parsed = parseCatalogPath(location.pathname)
  const isDetail = parsed.kind === 'detail'
  const mediaType: MediaType = isDetail ? parsed.mediaType : mediaTypeFromPath(location.pathname)
  const itemId = isDetail ? parsed.itemId : ''
  const language = resolveInterfaceLanguage(i18n.language)
  const locale = toLocaleCode(language)
  const routedItem = isDetail ? readRoutedItem(location.state, mediaType, itemId) : null

  const query = useDetailQuery(mediaType, itemId, language, { enabled: isDetail })
  const detail = query.data?.data
  const meta = query.data?.meta
  const seasons = detail?.seasons
  const selection = useSeasonSelection({ seasons, mediaType: detail?.mediaType })
  const seasonNumber = selection.effectiveSeason
  const seasonQuery = useSeasonQuery(mediaType, itemId, seasonNumber, language, {
    enabled: isDetail && detail?.mediaType === 'tv' && seasonNumber !== undefined,
  })
  const creditsQuery = useCreditsQuery(mediaType, itemId, language, {
    enabled: isDetail && detail !== undefined,
  })
  const similarQuery = useSimilarQuery(mediaType, itemId, language, {
    enabled: isDetail && detail !== undefined,
  })
  const collectionQuery = useCollectionQuery(mediaType, itemId, language, {
    enabled: isDetail && detail !== undefined && detail?.mediaType === 'movie',
  })
  const returnTarget = resolveDetailReturn(mediaType, location.state)
  const { setOverride } = useDocumentTitleOverride()
  const [announcement, setAnnouncement] = useState('')
  const announcedKey = useRef<string | null>(null)
  const seasonFallbackApplied = useRef<string | null>(null)
  const fallbackInitialSeason =
    detail?.mediaType === 'tv' && seasons !== undefined ? initialSeasonNumber(seasons) : undefined
  const seasonErrorState = seasonQuery.isError ? detailStateForError(seasonQuery.error) : undefined

  useEffect(() => {
    if (seasonErrorState !== 'season-fallback') {
      return
    }
    if (
      seasonNumber === undefined ||
      fallbackInitialSeason === undefined ||
      seasonNumber === fallbackInitialSeason ||
      detail === undefined
    ) {
      return
    }
    const key = `${detail.id}:${fallbackInitialSeason}:${language}`
    if (seasonFallbackApplied.current === key) {
      return
    }
    seasonFallbackApplied.current = key
    selection.selectSeason(fallbackInitialSeason)
  }, [detail, fallbackInitialSeason, language, seasonErrorState, seasonNumber, selection])

  useEffect(() => {
    if (detail === undefined) {
      setOverride(null)
      return
    }
    setOverride(
      t('meta.detailTitle', {
        title: detail.title,
        mediaType: t(`catalog.mediaType.${detail.mediaType}`),
      })
    )
    return () => setOverride(null)
  }, [detail, setOverride, t])

  useEffect(() => {
    if (detail === undefined) {
      return
    }
    const key = `${detail.id}:${language}:${detail.title}`
    if (announcedKey.current === key) {
      return
    }
    announcedKey.current = key
    setAnnouncement(t('detail.states.loaded', { title: detail.title }))
  }, [detail, language, t])

  const returnAction = (
    <Link to={returnTarget.path} className="min-h-11 w-fit px-1 text-caption">
      {returnTarget.isSearch
        ? t('catalog.actions.returnToSearch')
        : t('catalog.actions.returnToCatalog')}
    </Link>
  )

  if (!isDetail) {
    return (
      <div className="flex flex-col gap-section">
        <p className="text-caption uppercase tracking-wide text-text-muted">
          {t(`catalog.mediaType.${mediaType}`)}
        </p>
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t('detail.states.notFound.title')}
        </h1>
        <DetailNotFound returnAction={returnAction} />
        <ProviderAttribution />
        <LiveRegion message={announcement} />
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-section">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {routedItem?.title ?? t('detail.states.loading')}
        </h1>
        {returnAction}
        <DetailSkeleton />
        <ProviderAttribution />
        <LiveRegion message={announcement} />
      </div>
    )
  }

  if (query.isError && detail === undefined) {
    const errorState = detailStateForError(query.error)

    if (errorState === 'not-found') {
      return (
        <div className="flex flex-col gap-section">
          <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
            {t('detail.states.notFound.title')}
          </h1>
          <DetailNotFound returnAction={returnAction} />
          <ProviderAttribution />
          <LiveRegion message={announcement} />
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-section">
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-display text-text">
          {t('detail.states.error.title')}
        </h1>
        <DetailFailure
          onRetry={() => {
            void query.refetch()
          }}
          retrying={query.isFetching}
          returnAction={returnAction}
        />
        <ProviderAttribution />
        <LiveRegion message={announcement} />
      </div>
    )
  }

  if (detail === undefined) {
    return null
  }

  const lastUpdated = meta === undefined ? undefined : formatLastUpdated(meta.lastUpdatedAt, locale)
  const seasonMeta = seasonQuery.data?.meta
  const seasonLastUpdated =
    seasonMeta === undefined ? undefined : formatLastUpdated(seasonMeta.lastUpdatedAt, locale)
  const seasonFallbackPending =
    seasonErrorState === 'season-fallback' &&
    fallbackInitialSeason !== undefined &&
    seasonNumber !== fallbackInitialSeason
  const seasonStatus: SeasonSectionState['status'] = seasonFallbackPending
    ? 'loading'
    : seasonQuery.isPending
      ? 'loading'
      : seasonQuery.isError
        ? 'error'
        : isStaleMeta(seasonMeta)
          ? 'stale'
          : 'loaded'
  const creditsMeta = creditsQuery.data?.meta
  const creditsLastUpdated =
    creditsMeta === undefined ? undefined : formatLastUpdated(creditsMeta.lastUpdatedAt, locale)
  const creditsStatus: CreditsSectionState['status'] = creditsQuery.isPending
    ? 'loading'
    : creditsQuery.isError
      ? 'error'
      : isStaleMeta(creditsMeta)
        ? 'stale'
        : 'loaded'
  const similarMeta = similarQuery.data?.meta
  const similarLastUpdated =
    similarMeta === undefined ? undefined : formatLastUpdated(similarMeta.lastUpdatedAt, locale)
  const similarStatus: RelatedSectionState['status'] = similarQuery.isPending
    ? 'loading'
    : similarQuery.isError
      ? 'error'
      : isStaleMeta(similarMeta)
        ? 'stale'
        : 'loaded'
  const similarSection: RelatedSectionState = {
    status: similarStatus,
    ...(similarQuery.data === undefined ? {} : { items: similarQuery.data.data.items }),
    onRetry: () => {
      void similarQuery.refetch()
    },
    ...(similarLastUpdated === undefined
      ? {}
      : { lastUpdatedLabel: t('detail.states.stale.lastUpdated', { date: similarLastUpdated }) }),
  }
  const collectionMeta = collectionQuery.data?.meta
  const collectionLastUpdated =
    collectionMeta === undefined
      ? undefined
      : formatLastUpdated(collectionMeta.lastUpdatedAt, locale)
  const collectionStatus: RelatedSectionState['status'] = collectionQuery.isPending
    ? 'loading'
    : collectionQuery.isError
      ? 'error'
      : isStaleMeta(collectionMeta)
        ? 'stale'
        : 'loaded'
  const collectionSection: RelatedSectionState = {
    status: collectionStatus,
    ...(collectionQuery.data === undefined ? {} : { items: collectionQuery.data.data.items }),
    onRetry: () => {
      void collectionQuery.refetch()
    },
    ...(collectionLastUpdated === undefined
      ? {}
      : {
          lastUpdatedLabel: t('detail.states.stale.lastUpdated', { date: collectionLastUpdated }),
        }),
  }
  const creditsSection: CreditsSectionState = {
    status: creditsStatus,
    ...(creditsQuery.data === undefined ? {} : { data: creditsQuery.data.data }),
    onRetry: () => {
      void creditsQuery.refetch()
    },
    ...(creditsLastUpdated === undefined
      ? {}
      : { lastUpdatedLabel: t('detail.states.stale.lastUpdated', { date: creditsLastUpdated }) }),
  }
  const seasonSection =
    detail.mediaType === 'tv' &&
    seasons !== undefined &&
    seasons.length > 0 &&
    seasonNumber !== undefined
      ? {
          seasons,
          selectedSeason: seasonNumber,
          onSelectSeason: selection.selectSeason,
          announcement: selection.announcement,
          busy: seasonQuery.isFetching,
          season: {
            status: seasonStatus,
            ...(seasonQuery.data === undefined ? {} : { data: seasonQuery.data.data }),
            onRetry: () => {
              void seasonQuery.refetch()
            },
            ...(seasonLastUpdated === undefined
              ? {}
              : {
                  lastUpdatedLabel: t('detail.states.stale.lastUpdated', {
                    date: seasonLastUpdated,
                  }),
                }),
          } satisfies SeasonSectionState,
        }
      : undefined

  return (
    <div className="flex flex-col gap-section">
      <TitleDetailView
        detail={detail}
        returnAction={returnAction}
        attribution={<ProviderAttribution />}
        stale={
          isStaleMeta(meta)
            ? {
                lastUpdatedLabel: t('detail.states.stale.lastUpdated', {
                  date: lastUpdated ?? meta?.lastUpdatedAt ?? '',
                }),
              }
            : undefined
        }
        capabilities={capabilities}
        season={seasonSection}
        credits={creditsSection}
        similar={similarSection}
        collection={detail.mediaType === 'movie' ? collectionSection : undefined}
      />
      <LiveRegion message={announcement} />
    </div>
  )
}
