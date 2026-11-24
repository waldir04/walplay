import { describe, expect, it } from 'vitest'

import { trailerVideo, trailerMeta } from '@/test/fixtures/trailer'

import {
  TRAILER_TYPE_ORDER,
  playbackModeFor,
  rankTrailerVideos,
  trailerEnvelopeSchema,
  trailerVideoSchema,
} from './trailer'

const envelope = (data: unknown) => ({ data, meta: trailerMeta() })

describe('trailer model', () => {
  it('parses both inventory states', () => {
    expect(
      trailerEnvelopeSchema.safeParse(envelope({ state: 'available', videos: [trailerVideo()] }))
        .success
    ).toBe(true)
    expect(
      trailerEnvelopeSchema.safeParse(envelope({ state: 'no-videos', videos: [] })).success
    ).toBe(true)
  })

  it('rejects unknown keys and state/video mismatches', () => {
    expect(trailerVideoSchema.safeParse({ ...trailerVideo(), size: 1080 }).success).toBe(false)
    expect(
      trailerEnvelopeSchema.safeParse(envelope({ state: 'available', videos: [] })).success
    ).toBe(false)
    expect(
      trailerEnvelopeSchema.safeParse(envelope({ state: 'no-videos', videos: [trailerVideo()] }))
        .success
    ).toBe(false)
  })

  it('requires at least one authorized destination', () => {
    expect(
      trailerVideoSchema.safeParse(trailerVideo({ embedUrl: undefined, externalUrl: undefined }))
        .success
    ).toBe(false)
  })

  it('rejects non-HTTPS destinations, bad identifiers, and invalid dates', () => {
    expect(
      trailerVideoSchema.safeParse({
        ...trailerVideo(),
        externalUrl: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }).success
    ).toBe(false)
    expect(trailerVideoSchema.safeParse({ ...trailerVideo(), videoId: 'short' }).success).toBe(
      false
    )
    expect(trailerVideoSchema.safeParse({ ...trailerVideo(), publishedAt: 'nope' }).success).toBe(
      false
    )
  })

  it('declares the documented type order', () => {
    expect([...TRAILER_TYPE_ORDER]).toEqual([
      'trailer',
      'teaser',
      'featurette',
      'clip',
      'behind-the-scenes',
      'bloopers',
    ])
  })
})

const ranked = () => [
  trailerVideo({
    id: 'youtube:trailer0001',
    videoId: 'trailer0001',
    type: 'trailer',
    official: false,
  }),
  trailerVideo({
    id: 'youtube:teaser00002',
    videoId: 'teaser00002',
    type: 'teaser',
    official: true,
  }),
  trailerVideo({
    id: 'youtube:trailer0002',
    videoId: 'trailer0002',
    type: 'trailer',
    official: true,
  }),
  trailerVideo({
    id: 'youtube:clip0000001',
    videoId: 'clip0000001',
    type: 'clip',
    official: false,
  }),
]

describe('rankTrailerVideos', () => {
  it('orders by type and official before language', () => {
    const videos = rankTrailerVideos(ranked(), 'en')
    expect(videos.map((video) => video.id)).toEqual([
      'youtube:trailer0002',
      'youtube:trailer0001',
      'youtube:teaser00002',
      'youtube:clip0000001',
    ])
  })

  it('refines within a type and official step by interface-language match', () => {
    const videos = rankTrailerVideos(
      [
        trailerVideo({
          id: 'youtube:spanish0001',
          videoId: 'spanish0001',
          official: true,
          language: 'es',
        }),
        trailerVideo({
          id: 'youtube:english0001',
          videoId: 'english0001',
          official: true,
          language: 'en',
        }),
      ],
      'en'
    )

    expect(videos.map((video) => video.id)).toEqual(['youtube:english0001', 'youtube:spanish0001'])
  })

  it('preserves server order for complete ties', () => {
    const first = trailerVideo({ id: 'youtube:aaaaaaaaaaa', videoId: 'aaaaaaaaaaa' })
    const second = trailerVideo({ id: 'youtube:bbbbbbbbbbb', videoId: 'bbbbbbbbbbb' })

    expect(rankTrailerVideos([first, second], 'en').map((video) => video.id)).toEqual([
      first.id,
      second.id,
    ])
    expect(rankTrailerVideos([second, first], 'en').map((video) => video.id)).toEqual([
      second.id,
      first.id,
    ])
  })

  it('does not mutate the response list', () => {
    const videos = ranked()
    const copy = [...videos]
    rankTrailerVideos(videos, 'en')
    expect(videos).toEqual(copy)
  })
})

describe('playbackModeFor', () => {
  it('chooses embedded only when an embed URL exists and the width is compliant', () => {
    expect(playbackModeFor(trailerVideo(), true)).toBe('embedded')
    expect(playbackModeFor(trailerVideo(), false)).toBe('external')
    expect(playbackModeFor(trailerVideo({ embedUrl: undefined }), true)).toBe('external')
  })
})
