import { vi } from 'vitest'

import type {
  Credits,
  RelatedCollection,
  SeasonEpisodes,
  TitleDetail,
} from '../../domain/detail.js'
import { encodeItemId } from '../../lib/itemId.js'
import type { DetailProvider } from '../../providers/detail-provider.js'
import { CatalogCache } from '../../services/catalog-cache.js'
import { DetailService } from '../../services/detail.service.js'

export const sampleTitleDetail = (
  mediaType: 'movie' | 'tv' = 'movie',
  providerId = 550
): TitleDetail => ({
  id: encodeItemId(mediaType, providerId),
  mediaType,
  title: mediaType === 'movie' ? 'Fight Club' : 'Example Show',
  overview: 'An example overview.',
  releaseDate: mediaType === 'movie' ? '1999-10-15' : '2017-12-01',
  releaseYear: mediaType === 'movie' ? 1999 : 2017,
  status: mediaType === 'movie' ? 'released' : 'ended',
  genres: [{ id: '18', name: 'Drama' }],
  ...(mediaType === 'movie'
    ? { runtime: { minutes: 139, kind: 'movie' as const } }
    : {
        episodeRuntime: { minMinutes: 45, maxMinutes: 60 },
        tvSummary: { seasonsCount: 2, episodesCount: 18, networks: ['Netflix'] },
        seasons: [
          { number: 1, name: 'Season 1', airYear: 2017, episodeCount: 10 },
          { number: 2, name: 'Season 2', airYear: 2019, episodeCount: 8 },
        ],
      }),
  rating: { value: 8.4, voteCount: 30_123, scale: 10, source: 'tmdb' },
  popularity: 12.5,
})

export const sampleCredits = (): Credits => ({
  cast: [{ name: 'Edward Norton', character: 'The Narrator' }],
  crew: [{ name: 'David Fincher', role: 'director' }],
})

export const sampleSeasonEpisodes = (seasonNumber = 1): SeasonEpisodes => ({
  season: { number: seasonNumber, name: `Season ${seasonNumber}`, episodeCount: 1 },
  episodes: [
    {
      number: 1,
      name: 'Pilot',
      airDate: '2017-12-01',
      runtimeMinutes: 51,
      overview: 'An example episode.',
      rating: { value: 8.1, voteCount: 820, scale: 10, source: 'tmdb' },
    },
  ],
})

export const sampleCollection = (): RelatedCollection => ({
  name: 'Example Collection',
  items: [],
})

export interface FakeDetailProvider extends DetailProvider {
  readonly fetchDetail: ReturnType<typeof vi.fn<DetailProvider['fetchDetail']>>
  readonly fetchCredits: ReturnType<typeof vi.fn<DetailProvider['fetchCredits']>>
  readonly fetchSimilar: ReturnType<typeof vi.fn<DetailProvider['fetchSimilar']>>
  readonly fetchCollection: ReturnType<typeof vi.fn<DetailProvider['fetchCollection']>>
  readonly fetchSeason: ReturnType<typeof vi.fn<DetailProvider['fetchSeason']>>
}

export const createFakeDetailProvider = (): FakeDetailProvider => ({
  id: 'tmdb',
  fetchDetail: vi.fn<DetailProvider['fetchDetail']>(async ({ mediaType, providerId }) => ({
    detail: sampleTitleDetail(mediaType, providerId),
    ...(mediaType === 'movie' ? { collectionProviderId: 100 } : {}),
  })),
  fetchCredits: vi.fn<DetailProvider['fetchCredits']>(async () => sampleCredits()),
  fetchSimilar: vi.fn<DetailProvider['fetchSimilar']>(async () => []),
  fetchCollection: vi.fn<DetailProvider['fetchCollection']>(async () => sampleCollection()),
  fetchSeason: vi.fn<DetailProvider['fetchSeason']>(async ({ seasonNumber }) =>
    sampleSeasonEpisodes(seasonNumber)
  ),
})

export const createTestDetailService = (
  provider: DetailProvider = createFakeDetailProvider()
): DetailService =>
  new DetailService({
    provider,
    cache: new CatalogCache({ freshTtlMs: 1000, staleTtlMs: 10_000, maxEntries: 10 }),
  })
