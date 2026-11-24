import { describe, expect, it } from 'vitest'

import { tmdbTrailerDto, tmdbTrailerRecordDto } from './tmdb.trailer.schemas.js'

const record = {
  id: '5f1a',
  iso_639_1: 'en',
  iso_3166_1: 'US',
  name: 'Official Trailer',
  key: 'dQw4w9WgXcQ',
  site: 'YouTube',
  size: 1080,
  type: 'Trailer',
  official: true,
  published_at: '2026-01-15T12:00:00.000Z',
}

describe('tmdb trailer DTO', () => {
  it('parses a full record and a null results list', () => {
    expect(tmdbTrailerRecordDto.safeParse(record).success).toBe(true)
    const parsed = tmdbTrailerDto.safeParse({ id: 550, results: null })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.results).toBeNull()
    }
  })

  it('accepts a record without the optional official flag and null fields', () => {
    const { official: _official, ...withoutOfficial } = record
    expect(tmdbTrailerRecordDto.safeParse(withoutOfficial).success).toBe(true)
    expect(
      tmdbTrailerRecordDto.safeParse({
        ...record,
        iso_639_1: null,
        iso_3166_1: null,
        name: null,
        size: null,
        published_at: null,
      }).success
    ).toBe(true)
  })

  it('rejects malformed record fields', () => {
    expect(tmdbTrailerRecordDto.safeParse({ ...record, id: 5 }).success).toBe(false)
    expect(tmdbTrailerRecordDto.safeParse({ ...record, official: 'yes' }).success).toBe(false)
    expect(tmdbTrailerRecordDto.safeParse({ ...record, size: 'large' }).success).toBe(false)
  })

  it('requires a numeric top-level id', () => {
    expect(tmdbTrailerDto.safeParse({ id: '550', results: [] }).success).toBe(false)
  })
})
