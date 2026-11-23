import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import type { MediaType, Season } from '@/entities/catalog'

import { buildSeasonSearch, parseSeasonParam, resolveEffectiveSeason } from './seasonAddress'

export interface UseSeasonSelectionOptions {
  readonly seasons: readonly Season[] | undefined
  readonly mediaType: MediaType | undefined
}

export interface SeasonSelection {
  readonly effectiveSeason: number | undefined
  readonly selectSeason: (seasonNumber: number) => void
  readonly announcement: string
}

export const useSeasonSelection = ({
  seasons,
  mediaType,
}: UseSeasonSelectionOptions): SeasonSelection => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [announcement, setAnnouncement] = useState('')

  const requested = parseSeasonParam(searchParams.toString())
  const available = seasons ?? []
  const isTelevision = mediaType === 'tv'
  const effectiveSeason = isTelevision ? resolveEffectiveSeason(available, requested) : undefined

  useEffect(() => {
    if (!isTelevision || effectiveSeason === undefined || available.length === 0) {
      return
    }
    if (requested === effectiveSeason) {
      return
    }
    navigate(
      {
        pathname: location.pathname,
        search: buildSeasonSearch(location.search, effectiveSeason),
        hash: location.hash,
      },
      { replace: true, state: location.state }
    )
  }, [available.length, effectiveSeason, isTelevision, location, navigate, requested])

  const selectSeason = (seasonNumber: number) => {
    setAnnouncement(
      seasonNumber === 0
        ? t('detail.seasons.specialsAnnouncement')
        : t('detail.seasons.announcement', { number: seasonNumber })
    )
    navigate(
      {
        pathname: location.pathname,
        search: buildSeasonSearch(location.search, seasonNumber),
        hash: location.hash,
      },
      { replace: true, state: location.state }
    )
  }

  return { effectiveSeason, selectSeason, announcement }
}
