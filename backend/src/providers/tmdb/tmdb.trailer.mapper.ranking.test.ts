import { describe, expect, it } from 'vitest'

import { TRAILER_MAX_INVENTORY } from '../../domain/trailer.js'
import { mapTmdbTrailers } from './tmdb.trailer.mapper.js'
import type { TrailerRecordFixture } from '../../test/fixtures/tmdb/trailers.js'
import { officialTrailer } from '../../test/fixtures/tmdb/trailers.js'

const now = Date.parse('2026-11-24T12:00:00.000Z')
const context = {
  now,
  embedHosts: ['www.youtube-nocookie.com'],
  externalHosts: ['www.youtube.com'],
}

const keyFor = (index: number): string => `k${String(index).padStart(10, '0')}`

const record = (overrides: Partial<TrailerRecordFixture>): TrailerRecordFixture => ({
  ...officialTrailer(),
  ...overrides,
})

const map = (records: readonly TrailerRecordFixture[]) =>
  mapTmdbTrailers({ results: records }, context)

describe('tmdb trailer ranking', () => {
  it('ranks by type order, official first, then provider order', () => {
    const videos = map([
      record({ key: keyFor(1), type: 'Bloopers', official: true }),
      record({ key: keyFor(2), type: 'Trailer', official: false }),
      record({ key: keyFor(3), type: 'Teaser', official: true }),
      record({ key: keyFor(4), type: 'Trailer', official: true }),
      record({ key: keyFor(5), type: 'Clip', official: false }),
    ])

    expect(videos.map((video) => [video.type, video.official, video.videoId])).toEqual([
      ['trailer', true, keyFor(4)],
      ['trailer', false, keyFor(2)],
      ['teaser', true, keyFor(3)],
      ['clip', false, keyFor(5)],
      ['bloopers', true, keyFor(1)],
    ])
  })

  it('keeps provider order stable across repeated mapping', () => {
    const records = Array.from({ length: 10 }, (_, index) =>
      record({ key: keyFor(index), type: 'Trailer', official: false })
    )

    const first = map(records).map((video) => video.videoId)
    const second = map(records).map((video) => video.videoId)

    expect(first).toEqual(second)
    expect(first).toEqual(records.map((entry) => entry.key))
  })

  it('caps the ranked inventory at 24 videos', () => {
    const records = Array.from({ length: TRAILER_MAX_INVENTORY + 6 }, (_, index) =>
      record({ key: keyFor(index), type: 'Trailer', official: true })
    )

    const videos = map(records)

    expect(videos).toHaveLength(TRAILER_MAX_INVENTORY)
    expect(videos[0]?.videoId).toBe(keyFor(0))
    expect(videos[TRAILER_MAX_INVENTORY - 1]?.videoId).toBe(keyFor(TRAILER_MAX_INVENTORY - 1))
  })

  it('honours a configured smaller cap', () => {
    const records = Array.from({ length: 5 }, (_, index) =>
      record({ key: keyFor(index), type: 'Trailer', official: true })
    )

    expect(
      mapTmdbTrailers({ results: records }, { ...context, maxInventory: 3 })
    ).toHaveLength(3)
  })

  it('builds the documented embed and canonical watch URLs', () => {
    const videos = map([record({ key: 'dQw4w9WgXcQ' })])

    expect(videos[0]).toMatchObject({
      id: 'youtube:dQw4w9WgXcQ',
      platform: 'youtube',
      platformName: 'YouTube',
      embedUrl:
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
      externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
  })

  it('uses only the configured authorized hosts', () => {
    const videos = mapTmdbTrailers(
      { results: [record({ key: 'dQw4w9WgXcQ' })] },
      {
        now,
        embedHosts: ['embed.example.test'],
        externalHosts: ['watch.example.test'],
      }
    )

    expect(videos[0]?.embedUrl).toBe(
      'https://embed.example.test/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1'
    )
    expect(videos[0]?.externalUrl).toBe(
      'https://watch.example.test/watch?v=dQw4w9WgXcQ'
    )
  })

  it('falls back to the external destination when no embed host is usable', () => {
    const videos = mapTmdbTrailers(
      { results: [record({ key: 'dQw4w9WgXcQ' })] },
      { now, embedHosts: ['not a host'], externalHosts: ['www.youtube.com'] }
    )

    expect(videos[0]?.embedUrl).toBeUndefined()
    expect(videos[0]?.externalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  it('keeps optional language and date without inventing missing values', () => {
    const videos = map([
      record({ key: 'dQw4w9WgXcQ', iso_639_1: 'en', published_at: '2026-01-15T12:00:00.000Z' }),
      record({ key: keyFor(9), iso_639_1: null, published_at: null }),
    ])

    expect(videos[0]?.language).toBe('en')
    expect(videos[0]?.publishedAt).toBe('2026-01-15T12:00:00.000Z')
    expect(videos[1]?.language).toBeUndefined()
    expect(videos[1]?.publishedAt).toBeUndefined()
  })

  it('never exposes provider-only fields', () => {
    const serialized = JSON.stringify(map([record({ key: 'dQw4w9WgXcQ' })]))

    expect(serialized).not.toContain('size')
    expect(serialized).not.toContain('iso_')
    expect(serialized).not.toContain('1080')
  })
})
