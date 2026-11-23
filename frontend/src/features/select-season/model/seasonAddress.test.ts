import { describe, expect, it } from 'vitest'

import {
  buildSeasonSearch,
  firstRegularSeason,
  initialSeasonNumber,
  parseSeasonParam,
  resolveEffectiveSeason,
  seasonOptionLabel,
} from './seasonAddress'
import type { Season } from '@/entities/catalog'

const seasons: readonly Season[] = [
  { number: 1, name: 'Season 1', airYear: 2017, episodeCount: 10 },
  { number: 2, name: 'Season 2', airYear: 2019, episodeCount: 8 },
  { number: 0, name: 'Specials', airYear: 2018, episodeCount: 2 },
]

const translate = (key: string, options?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'detail.seasons.specials': 'Specials',
    'detail.seasons.option': `Season ${String(options?.number)}`,
    'detail.seasons.optionWithYear': `Season ${String(options?.number)} · ${String(options?.year)}`,
    'detail.seasons.optionWithCount': `Season ${String(options?.number)} · ${String(options?.count)} episodes`,
  }
  return map[key] ?? key
}

describe('season address parsing', () => {
  it('parses the first occurrence as an integer', () => {
    expect(parseSeasonParam('?season=2')).toBe(2)
    expect(parseSeasonParam('?season=2&season=3')).toBe(2)
    expect(parseSeasonParam('?foo=bar&season=01')).toBe(1)
    expect(parseSeasonParam('?season=0')).toBe(0)
  })

  it('treats non-integer, negative, out-of-range, and absent values as absent', () => {
    for (const search of [
      '',
      '?season=',
      '?season=abc',
      '?season=-1',
      '?season=1.5',
      '?season=1000',
      '?other=2',
    ]) {
      expect(parseSeasonParam(search)).toBeUndefined()
    }
  })
})

describe('effective season resolution', () => {
  it('uses a valid supplied season', () => {
    expect(resolveEffectiveSeason(seasons, 2)).toBe(2)
    expect(resolveEffectiveSeason(seasons, 0)).toBe(0)
  })

  it('falls back to the first regular season, then the first available', () => {
    expect(resolveEffectiveSeason(seasons, undefined)).toBe(1)
    expect(resolveEffectiveSeason(seasons, 999)).toBe(1)
    expect(resolveEffectiveSeason([{ number: 0 }], undefined)).toBe(0)
    expect(resolveEffectiveSeason([], undefined)).toBeUndefined()
  })

  it('identifies the initial season helpers', () => {
    expect(firstRegularSeason(seasons)?.number).toBe(1)
    expect(initialSeasonNumber([{ number: 0 }])).toBe(0)
    expect(initialSeasonNumber([])).toBeUndefined()
  })
})

describe('season address building', () => {
  it('replaces the season and preserves other parameters', () => {
    expect(buildSeasonSearch('?season=2&foo=bar', 3)).toBe('?season=3&foo=bar')
    expect(buildSeasonSearch('?season=2&season=3', 1)).toBe('?season=1')
    expect(buildSeasonSearch('', 1)).toBe('?season=1')
    expect(buildSeasonSearch('?foo=bar', 0)).toBe('?foo=bar&season=0')
  })

  it('labels regular seasons, specials, years, and counts', () => {
    expect(seasonOptionLabel(seasons[0]!, translate)).toBe('Season 1 · 10 episodes')
    expect(seasonOptionLabel({ number: 2, airYear: 2019 }, translate)).toBe('Season 2 · 2019')
    expect(seasonOptionLabel({ number: 3 }, translate)).toBe('Season 3')
    expect(seasonOptionLabel({ number: 0 }, translate)).toBe('Specials')
  })
})
