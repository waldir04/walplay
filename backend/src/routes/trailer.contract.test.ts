import { describe, expect, it } from 'vitest'

import {
  availableTrailerEnvelopeSchema,
  noVideosTrailerEnvelopeSchema,
  trailerVideoSchema,
} from '../domain/trailer.schemas.js'

const availableExample = {
  data: {
    state: 'available',
    videos: [
      {
        id: 'youtube:dQw4w9WgXcQ',
        platform: 'youtube',
        platformName: 'YouTube',
        videoId: 'dQw4w9WgXcQ',
        title: 'Official Trailer',
        type: 'trailer',
        official: true,
        language: 'en',
        publishedAt: '2026-01-15T12:00:00.000Z',
        embedUrl:
          'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
        externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        id: 'youtube:abc123DEF45',
        platform: 'youtube',
        platformName: 'YouTube',
        videoId: 'abc123DEF45',
        title: 'Teaser',
        type: 'teaser',
        official: false,
        externalUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      },
    ],
  },
  meta: {
    stale: false,
    lastUpdatedAt: '2026-11-24T12:00:00.000Z',
    source: 'provider',
    freshness: 'current',
  },
}

const noVideosExample = {
  data: { state: 'no-videos', videos: [] },
  meta: {
    stale: true,
    lastUpdatedAt: '2026-11-23T12:05:00.000Z',
    source: 'stale-cache',
    freshness: 'stale',
  },
}

describe('trailer inventory contract', () => {
  it('parses the documented available envelope', () => {
    expect(availableTrailerEnvelopeSchema.safeParse(availableExample).success).toBe(true)
  })

  it('parses the documented no-videos envelope', () => {
    expect(noVideosTrailerEnvelopeSchema.safeParse(noVideosExample).success).toBe(true)
  })

  it('exposes only the documented video field set', () => {
    expect(Object.keys(availableExample.data.videos[0] ?? {}).sort()).toEqual(
      [
        'embedUrl',
        'externalUrl',
        'id',
        'language',
        'official',
        'platform',
        'platformName',
        'publishedAt',
        'title',
        'type',
        'videoId',
      ].sort()
    )
    expect(JSON.stringify(availableExample)).not.toMatch(/"size"|iso_|providerId|tmdb/i)
  })

  it('accepts every documented promotional type', () => {
    for (const type of [
      'trailer',
      'teaser',
      'featurette',
      'clip',
      'behind-the-scenes',
      'bloopers',
    ]) {
      const parsed = trailerVideoSchema.safeParse({
        ...availableExample.data.videos[1],
        type,
      })
      expect(parsed.success).toBe(true)
    }
  })
})
