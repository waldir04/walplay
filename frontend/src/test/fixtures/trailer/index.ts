import type { TrailerEnvelope, TrailerMeta, TrailerVideo } from '@/entities/catalog'

export const TRAILER_VIDEO_ID = 'dQw4w9WgXcQ'
export const SECOND_TRAILER_VIDEO_ID = 'abc123DEF45'

export const trailerMeta = (overrides: Partial<TrailerMeta> = {}): TrailerMeta => ({
  stale: false,
  lastUpdatedAt: '2026-11-24T12:00:00.000Z',
  source: 'provider',
  freshness: 'current',
  ...overrides,
})

export const trailerVideo = (overrides: Partial<TrailerVideo> = {}): TrailerVideo => ({
  id: `youtube:${TRAILER_VIDEO_ID}`,
  platform: 'youtube',
  platformName: 'YouTube',
  videoId: TRAILER_VIDEO_ID,
  title: 'Official Trailer',
  type: 'trailer',
  official: true,
  language: 'en',
  publishedAt: '2026-01-15T12:00:00.000Z',
  embedUrl: `https://www.youtube-nocookie.com/embed/${TRAILER_VIDEO_ID}?autoplay=1&playsinline=1`,
  externalUrl: `https://www.youtube.com/watch?v=${TRAILER_VIDEO_ID}`,
  ...overrides,
})

export const teaserVideo = (overrides: Partial<TrailerVideo> = {}): TrailerVideo =>
  trailerVideo({
    id: `youtube:${SECOND_TRAILER_VIDEO_ID}`,
    videoId: SECOND_TRAILER_VIDEO_ID,
    title: 'First Teaser',
    type: 'teaser',
    official: false,
    language: 'es',
    publishedAt: undefined,
    embedUrl: `https://www.youtube-nocookie.com/embed/${SECOND_TRAILER_VIDEO_ID}?autoplay=1&playsinline=1`,
    externalUrl: `https://www.youtube.com/watch?v=${SECOND_TRAILER_VIDEO_ID}`,
    ...overrides,
  })

export const trailerVideos = (): readonly TrailerVideo[] => [
  trailerVideo(),
  teaserVideo(),
  trailerVideo({
    id: 'youtube:clip0000001',
    videoId: 'clip0000001',
    title: 'Behind the Scenes Clip',
    type: 'behind-the-scenes',
    official: false,
    language: undefined,
    publishedAt: undefined,
    embedUrl: 'https://www.youtube-nocookie.com/embed/clip0000001?autoplay=1&playsinline=1',
    externalUrl: 'https://www.youtube.com/watch?v=clip0000001',
  }),
]

export const availableTrailerEnvelope = (
  videos: readonly TrailerVideo[] = trailerVideos(),
  meta: Partial<TrailerMeta> = {}
): TrailerEnvelope => ({
  data: { state: 'available', videos },
  meta: trailerMeta(meta),
})

export const noVideosTrailerEnvelope = (meta: Partial<TrailerMeta> = {}): TrailerEnvelope => ({
  data: { state: 'no-videos', videos: [] },
  meta: trailerMeta(meta),
})

export const staleTrailerEnvelope = (): TrailerEnvelope =>
  availableTrailerEnvelope(trailerVideos(), {
    stale: true,
    source: 'stale-cache',
    freshness: 'stale',
    lastUpdatedAt: '2026-11-20T09:30:00.000Z',
  })

export const externalOnlyVideo = (): TrailerVideo => trailerVideo({ embedUrl: undefined })
