import { describe, expect, it } from 'vitest'

import {
  availableTrailerEnvelopeSchema,
  noVideosTrailerEnvelopeSchema,
  trailerEnvelopeSchema,
  trailerVideoSchema,
} from './trailer.schemas.js'

const video = {
  id: 'youtube:dQw4w9WgXcQ',
  platform: 'youtube',
  platformName: 'YouTube',
  videoId: 'dQw4w9WgXcQ',
  title: 'Official Trailer',
  type: 'trailer',
  official: true,
  language: 'en',
  publishedAt: '2026-01-15T12:00:00.000Z',
  embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
  externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
}

const meta = {
  stale: false,
  lastUpdatedAt: '2026-11-24T12:00:00.000Z',
  source: 'provider',
  freshness: 'current',
}

describe('trailer response schemas', () => {
  it('accepts the available and no-videos envelopes', () => {
    expect(
      availableTrailerEnvelopeSchema.safeParse({
        data: { state: 'available', videos: [video] },
        meta,
      }).success
    ).toBe(true)
    expect(
      noVideosTrailerEnvelopeSchema.safeParse({
        data: { state: 'no-videos', videos: [] },
        meta,
      }).success
    ).toBe(true)
  })

  it('accepts a video with only an external destination', () => {
    const { embedUrl: _embedUrl, ...externalOnly } = video
    expect(trailerVideoSchema.safeParse(externalOnly).success).toBe(true)
  })

  it('rejects unknown keys at every level', () => {
    expect(
      trailerVideoSchema.safeParse({ ...video, size: 1080 }).success
    ).toBe(false)
    expect(
      availableTrailerEnvelopeSchema.safeParse({
        data: { state: 'available', videos: [video], extra: true },
        meta,
      }).success
    ).toBe(false)
    expect(
      availableTrailerEnvelopeSchema.safeParse({
        data: { state: 'available', videos: [video] },
        meta: { ...meta, providerId: 550 },
      }).success
    ).toBe(false)
  })

  it('rejects non-HTTPS URLs', () => {
    expect(
      trailerVideoSchema.safeParse({
        ...video,
        embedUrl: 'http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      }).success
    ).toBe(false)
  })

  it('rejects malformed identifiers and dates', () => {
    expect(trailerVideoSchema.safeParse({ ...video, videoId: 'short' }).success).toBe(false)
    expect(trailerVideoSchema.safeParse({ ...video, id: 'vimeo:dQw4w9WgXcQ' }).success).toBe(false)
    expect(trailerVideoSchema.safeParse({ ...video, publishedAt: 'not-a-date' }).success).toBe(
      false
    )
    expect(
      trailerVideoSchema.safeParse({ ...video, language: 'english' }).success
    ).toBe(false)
  })

  it('requires a destination on every video', () => {
    const { embedUrl: _embedUrl, externalUrl: _externalUrl, ...withoutUrls } = video
    expect(trailerVideoSchema.safeParse(withoutUrls).success).toBe(false)
  })

  it('rejects a video on a non-YouTube platform and unknown promotional types', () => {
    expect(trailerVideoSchema.safeParse({ ...video, platform: 'vimeo' }).success).toBe(false)
    expect(trailerVideoSchema.safeParse({ ...video, type: 'recap' }).success).toBe(false)
  })

  it('keeps the two inventory states disjoint', () => {
    expect(
      trailerEnvelopeSchema.safeParse({
        data: { state: 'available', videos: [] },
        meta,
      }).success
    ).toBe(false)
    expect(
      trailerEnvelopeSchema.safeParse({
        data: { state: 'no-videos', videos: [video] },
        meta,
      }).success
    ).toBe(false)
  })
})
