import { describe, expect, it } from 'vitest'

import {
  buildDetailRating,
  buildEpisodeRuntime,
  buildMovieRuntime,
  buildPopularity,
  extractDetailYear,
  mapCrewRole,
  mapTitleStatus,
  normalizeDescriptiveText,
  normalizeTitleText,
  parseDetailDate,
  resolveTitleFields,
} from './tmdb.detail.mapper.js'

describe('detail text normalization', () => {
  it('trims usable text and drops empty values', () => {
    expect(normalizeTitleText('  Fight Club ')).toBe('Fight Club')
    expect(normalizeTitleText('   ')).toBeUndefined()
    expect(normalizeTitleText(null)).toBeUndefined()
  })

  it('treats only the documented title placeholders as missing', () => {
    for (const placeholder of ['n/a', 'N/A', 'null', 'undefined', 'tbd']) {
      expect(normalizeTitleText(placeholder)).toBeUndefined()
    }
    expect(normalizeTitleText('Unknown')).toBe('Unknown')
    expect(normalizeTitleText('Untitled')).toBe('Untitled')
  })

  it('drops descriptive placeholders', () => {
    for (const placeholder of ['n/a', 'na', 'tbd', 'unknown', 'Untitled', '-', '--', '—']) {
      expect(normalizeDescriptiveText(placeholder)).toBeUndefined()
    }
    expect(normalizeDescriptiveText(' A real overview ')).toBe('A real overview')
  })

  it('resolves localized titles first and exposes the original only when different', () => {
    expect(resolveTitleFields('Fight Club', 'Fight Club')).toEqual({ title: 'Fight Club' })
    expect(resolveTitleFields('El club de la lucha', 'Fight Club')).toEqual({
      title: 'El club de la lucha',
      originalTitle: 'Fight Club',
    })
    expect(resolveTitleFields('  ', 'Fight Club')).toEqual({ title: 'Fight Club' })
    expect(resolveTitleFields('N/A', 'tbd')).toBeNull()
  })
})

describe('detail dates', () => {
  it('accepts only strict plausible calendar dates', () => {
    expect(parseDetailDate('1999-10-15')).toEqual({ date: '1999-10-15', year: 1999 })
    expect(parseDetailDate('1999-02-30')).toBeUndefined()
    expect(parseDetailDate('0000-00-00')).toBeUndefined()
    expect(parseDetailDate('15/10/1999')).toBeUndefined()
    expect(parseDetailDate('1800-01-01')).toBeUndefined()
    expect(parseDetailDate('')).toBeUndefined()
  })

  it('derives a year only from a plausible leading four-digit year', () => {
    expect(extractDetailYear('1999-13-01')).toBe(1999)
    expect(extractDetailYear('1999')).toBe(1999)
    expect(extractDetailYear('99')).toBeUndefined()
    expect(extractDetailYear('1200-01-01')).toBeUndefined()
  })
})

describe('detail numbers', () => {
  it('requires a positive rating with a positive integer vote count', () => {
    expect(buildDetailRating(8.444, 100)).toEqual({
      value: 8.4,
      voteCount: 100,
      scale: 10,
      source: 'tmdb',
    })
    expect(buildDetailRating(0, 100)).toBeUndefined()
    expect(buildDetailRating(-1, 100)).toBeUndefined()
    expect(buildDetailRating(11, 100)).toBeUndefined()
    expect(buildDetailRating(Number.NaN, 100)).toBeUndefined()
    expect(buildDetailRating(8, 0)).toBeUndefined()
    expect(buildDetailRating(8, 1.5)).toBeUndefined()
  })

  it('accepts only plausible movie runtimes', () => {
    expect(buildMovieRuntime(139)).toEqual({ minutes: 139, kind: 'movie' })
    for (const invalid of [0, -1, 1.5, 901, null, undefined]) {
      expect(buildMovieRuntime(invalid)).toBeUndefined()
    }
  })

  it('reduces distinct episode runtimes to a typical value or range', () => {
    expect(buildEpisodeRuntime([45])).toEqual({ minMinutes: 45 })
    expect(buildEpisodeRuntime([60, 45, 60, 0, 700])).toEqual({
      minMinutes: 45,
      maxMinutes: 60,
    })
    expect(buildEpisodeRuntime([])).toBeUndefined()
    expect(buildEpisodeRuntime([0, -3])).toBeUndefined()
  })

  it('accepts only finite positive popularity', () => {
    expect(buildPopularity(12.5)).toBe(12.5)
    expect(buildPopularity(0)).toBeUndefined()
    expect(buildPopularity(-1)).toBeUndefined()
    expect(buildPopularity(Number.POSITIVE_INFINITY)).toBeUndefined()
  })
})

describe('detail enumerations', () => {
  it('maps provider statuses case-insensitively', () => {
    expect(mapTitleStatus('Released')).toBe('released')
    expect(mapTitleStatus('IN PRODUCTION')).toBe('in-production')
    expect(mapTitleStatus('returning_series')).toBe('returning')
    expect(mapTitleStatus('Cancelled')).toBe('canceled')
    expect(mapTitleStatus('unknown-status')).toBeUndefined()
    expect(mapTitleStatus('')).toBeUndefined()
  })

  it('maps only supported crew jobs', () => {
    expect(mapCrewRole('Director')).toBe('director')
    expect(mapCrewRole('Screenplay')).toBe('writer')
    expect(mapCrewRole('Teleplay')).toBe('writer')
    expect(mapCrewRole('Creator')).toBe('creator')
    expect(mapCrewRole('Gaffer')).toBeUndefined()
    expect(mapCrewRole(null)).toBeUndefined()
  })
})
