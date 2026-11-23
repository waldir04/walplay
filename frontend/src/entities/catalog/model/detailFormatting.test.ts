import { describe, expect, it } from 'vitest'

import {
  formatDetailDate,
  formatDetailDateOrYear,
  formatEpisodeAirDate,
  formatEpisodeRuntime,
  formatLastUpdated,
  formatLocalizedNumber,
  formatMinutes,
  formatMovieDuration,
  formatPopularity,
  formatRatingAccessibleText,
  formatRatingValue,
  formatVoteCount,
  formatVoteCountText,
} from './detailFormatting'
import type { TranslateFn } from './detailFormatting'
import { i18n } from '@/app/i18n'

const translate: TranslateFn = (key, options) => i18n.t(key, options)

describe('detail formatting', () => {
  it('formats full dates for both locales', () => {
    expect(formatDetailDate('1999-10-15', 'en-US')).toBe('October 15, 1999')
    expect(formatDetailDate('1999-10-15', 'es-ES')).toBe('15 de octubre de 1999')
    expect(formatDetailDate('1999-13-15', 'en-US')).toBeUndefined()
    expect(formatDetailDate(undefined, 'en-US')).toBeUndefined()
  })

  it('falls back to a four-digit year when no complete date is usable', () => {
    expect(formatDetailDateOrYear('1999-10-15', 1999, 'en-US')).toBe('October 15, 1999')
    expect(formatDetailDateOrYear(undefined, 1999, 'en-US')).toBe('1999')
    expect(formatDetailDateOrYear(undefined, undefined, 'en-US')).toBeUndefined()
  })

  it('formats an episode air date or year', () => {
    expect(formatEpisodeAirDate('2017-12-01', 'en-US')).toBe('December 1, 2017')
    expect(formatEpisodeAirDate('2017', 'en-US')).toBe('2017')
    expect(formatEpisodeAirDate('nope', 'en-US')).toBeUndefined()
  })

  it('formats movie durations with localized numerals', () => {
    expect(formatMovieDuration(139, 'en-US', translate)).toBe('2 h 19 min')
    expect(formatMovieDuration(139, 'es-ES', translate)).toBe('2 h 19 min')
    expect(formatMovieDuration(45, 'en-US', translate)).toBe('45 min')
    expect(formatMinutes(1400, 'en-US', translate)).toBe('1,400 min')
    expect(formatLocalizedNumber(1400, 'es-ES')).toBe('1400')
  })

  it('formats tv episode durations as a typical value or a range', async () => {
    expect(formatEpisodeRuntime({ minMinutes: 45 }, 'en-US', translate)).toBe(
      'About 45 min per episode'
    )
    expect(formatEpisodeRuntime({ minMinutes: 45, maxMinutes: 60 }, 'en-US', translate)).toBe(
      '45 min–60 min'
    )
    await i18n.changeLanguage('es')
    expect(formatEpisodeRuntime({ minMinutes: 45, maxMinutes: 45 }, 'es-ES', translate)).toBe(
      'Aproximadamente 45 min por episodio'
    )
    await i18n.changeLanguage('en')
  })

  it('formats ratings, vote counts, and popularity for both locales', () => {
    expect(formatRatingValue(8.4, 'en-US')).toBe('8.4')
    expect(formatRatingValue(8.4, 'es-ES')).toBe('8,4')
    expect(formatVoteCount(30_123, 'en-US')).toBe('30,123')
    expect(formatVoteCount(30_123, 'es-ES')).toBe('30.123')
    expect(formatPopularity(63.421, 'en-US')).toBe('63.4')
    expect(formatVoteCountText(30_123, 'en-US', translate)).toBe('30,123 votes')
    expect(formatVoteCountText(1, 'en-US', translate)).toBe('1 vote')
    expect(
      formatRatingAccessibleText(
        { value: 8.4, voteCount: 30_123, scale: 10, source: 'tmdb' },
        'en-US',
        translate
      )
    ).toBe('8.4 out of 10, from 30,123 votes')
  })

  it('formats a localized last-updated moment and rejects invalid values', () => {
    expect(formatLastUpdated('2026-11-20T09:30:00.000Z', 'en-US')).toContain('Nov')
    expect(formatLastUpdated('not-a-date', 'en-US')).toBeUndefined()
  })
})
