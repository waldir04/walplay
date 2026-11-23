import { MAX_SEASON_NUMBER, MIN_SEASON_NUMBER } from '@/shared/config/constants'

import type { Season } from '@/entities/catalog/model/titleDetail'

const SEASON_PARAM = 'season'
const INTEGER_PATTERN = /^\d{1,3}$/

export const parseSeasonParam = (search: string): number | undefined => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const first = params.getAll(SEASON_PARAM)[0]
  if (first === undefined) {
    return undefined
  }
  const normalized = first.trim()
  if (!INTEGER_PATTERN.test(normalized)) {
    return undefined
  }
  const value = Number.parseInt(normalized, 10)
  if (!Number.isInteger(value) || value < MIN_SEASON_NUMBER || value > MAX_SEASON_NUMBER) {
    return undefined
  }
  return value
}

export const firstRegularSeason = (seasons: readonly Season[]): Season | undefined =>
  seasons.find((season) => season.number > 0)

export const initialSeasonNumber = (seasons: readonly Season[]): number | undefined =>
  firstRegularSeason(seasons)?.number ?? seasons[0]?.number

export const resolveEffectiveSeason = (
  seasons: readonly Season[],
  requested: number | undefined
): number | undefined => {
  if (seasons.length === 0) {
    return undefined
  }
  if (requested !== undefined && seasons.some((season) => season.number === requested)) {
    return requested
  }
  return initialSeasonNumber(seasons)
}

export const buildSeasonSearch = (search: string, seasonNumber: number): string => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.set(SEASON_PARAM, String(seasonNumber))
  const serialized = params.toString()
  return serialized.length === 0 ? '' : `?${serialized}`
}

export const seasonOptionLabel = (
  season: Season,
  translate: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (season.number === 0) {
    return translate('detail.seasons.specials')
  }
  if (season.episodeCount !== undefined) {
    return translate('detail.seasons.optionWithCount', {
      number: season.number,
      count: season.episodeCount,
    })
  }
  if (season.airYear !== undefined) {
    return translate('detail.seasons.optionWithYear', {
      number: season.number,
      year: season.airYear,
    })
  }
  return translate('detail.seasons.option', { number: season.number })
}
