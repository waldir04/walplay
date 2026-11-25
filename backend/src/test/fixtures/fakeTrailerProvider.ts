import { vi } from 'vitest'

import type { TrailerVideo } from '../../domain/trailer.js'
import type { TrailerProvider } from '../../providers/trailer-provider.js'
import { CatalogCache } from '../../services/catalog-cache.js'
import { TrailerService } from '../../services/trailer.service.js'

export const sampleTrailerVideo = (
  overrides: Partial<TrailerVideo> = {}
): TrailerVideo => ({
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
  ...overrides,
})

export interface FakeTrailerProvider extends TrailerProvider {
  readonly fetchTrailers: ReturnType<typeof vi.fn<TrailerProvider['fetchTrailers']>>
}

export const createFakeTrailerProvider = (
  videos: readonly TrailerVideo[] = [sampleTrailerVideo()]
): FakeTrailerProvider => ({
  id: 'tmdb',
  fetchTrailers: vi.fn<TrailerProvider['fetchTrailers']>(async () => ({ videos })),
})

export const createTestTrailerService = (
  provider: TrailerProvider = createFakeTrailerProvider(),
  options: { readonly now?: () => number } = {}
): TrailerService =>
  new TrailerService({
    provider,
    cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 20 }),
    freshnessWindowMs: 1000,
    retentionMs: 10_000,
    ...(options.now === undefined ? {} : { now: options.now }),
  })
