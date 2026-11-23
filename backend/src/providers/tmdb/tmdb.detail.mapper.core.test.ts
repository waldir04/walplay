import { describe, expect, it } from 'vitest'

import { decodeItemId } from '../../lib/itemId.js'
import { mapMovieDetail, mapTvDetail } from './tmdb.detail.mapper.js'
import {
  adultMovieDetail,
  completeMovieDetail,
  completeTvDetail,
  emptyStringMovieDetail,
  minimalMovieDetail,
  originalLanguageOnlyTv,
  placeholderMovieDetail,
} from '../../test/fixtures/tmdb/detail.js'

const artwork = {
  poster: (path: string | null | undefined) =>
    typeof path === 'string' && path.trim() !== ''
      ? { url: `https://image.example.test/w342${path}` }
      : undefined,
  backdrop: (path: string | null | undefined) =>
    typeof path === 'string' && path.trim() !== ''
      ? { url: `https://image.example.test/w780${path}` }
      : undefined,
}

describe('movie detail mapping', () => {
  it('maps a complete movie into provider-neutral detail', () => {
    const mapped = mapMovieDetail(completeMovieDetail(), artwork)
    expect(mapped).not.toBeNull()
    const detail = mapped!.detail

    expect(detail.mediaType).toBe('movie')
    expect(decodeItemId(detail.id)).toMatchObject({ mediaType: 'movie', providerId: 550 })
    expect(detail).toMatchObject({
      title: 'Fight Club',
      overview: 'A ticking-time-bomb insomniac and a slippery soap salesman.',
      tagline: 'Mischief. Mayhem. Soap.',
      releaseDate: '1999-10-15',
      releaseYear: 1999,
      status: 'released',
      runtime: { minutes: 139, kind: 'movie' },
      popularity: 63.421,
      collection: { name: 'Fight Club Collection' },
      trailer: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', site: 'youtube' },
    })
    expect(detail.genres).toEqual([
      { id: '18', name: 'Drama' },
      { id: '53', name: 'Thriller' },
    ])
    expect(detail.rating).toEqual({
      value: 8.4,
      voteCount: 30_123,
      scale: 10,
      source: 'tmdb',
    })
    expect(detail.poster?.url).toContain('/w342/poster.jpg')
    expect(detail.backdrop?.url).toContain('/w780/backdrop.jpg')
    expect(mapped!.collectionProviderId).toBe(100)
    expect(JSON.stringify(detail)).not.toContain('poster_path')
  })

  it('returns null for adult, unknown, and unusable identities', () => {
    expect(mapMovieDetail(adultMovieDetail(), artwork)).toBeNull()
    expect(mapMovieDetail(completeMovieDetail({ id: 0 }), artwork)).toBeNull()
    expect(mapMovieDetail(completeMovieDetail({ id: 1.5 }), artwork)).toBeNull()
    expect(mapMovieDetail(completeMovieDetail({ title: '', original_title: '' }), artwork)).toBeNull()
  })

  it('uses only the original title when the localized one is unusable', () => {
    const detail = mapMovieDetail(completeMovieDetail({ title: 'N/A' }), artwork)?.detail
    expect(detail?.title).toBe('Fight Club')
    expect(detail?.originalTitle).toBeUndefined()
  })

  it('falls back to the original-language overview without using placeholders', () => {
    const detail = mapMovieDetail(completeMovieDetail({ overview: '', tagline: 'N/A' }), {
      ...artwork,
      fallbackOverview: 'Original overview.',
      fallbackTagline: 'Original tagline.',
    })?.detail
    expect(detail?.overview).toBe('Original overview.')
    expect(detail?.tagline).toBe('Original tagline.')
  })

  it('omits every unusable optional field', () => {
    const detail = mapMovieDetail(emptyStringMovieDetail(), artwork)?.detail
    expect(detail).toMatchObject({ title: 'Original Only', genres: [] })
    expect(detail).not.toHaveProperty('overview')
    expect(detail).not.toHaveProperty('tagline')
    expect(detail).not.toHaveProperty('releaseDate')
    expect(detail).not.toHaveProperty('releaseYear')
    expect(detail).not.toHaveProperty('runtime')
    expect(detail).not.toHaveProperty('rating')
    expect(detail).not.toHaveProperty('popularity')
    expect(detail).not.toHaveProperty('poster')
    expect(detail).not.toHaveProperty('backdrop')
    expect(detail).not.toHaveProperty('collection')
    expect(detail).not.toHaveProperty('trailer')
  })

  it('treats a placeholder-only identity as not found', () => {
    expect(mapMovieDetail(placeholderMovieDetail(), artwork)).toBeNull()
  })

  it('drops placeholder text and unknown statuses without dropping a usable title', () => {
    const detail = mapMovieDetail(
      completeMovieDetail({
        overview: 'N/A',
        tagline: 'Unknown',
        status: 'not-a-status',
        genres: [{ id: 1, name: 'N/A' }],
      }),
      artwork
    )?.detail
    expect(detail?.title).toBe('Fight Club')
    expect(detail?.overview).toBeUndefined()
    expect(detail?.tagline).toBeUndefined()
    expect(detail?.status).toBeUndefined()
    expect(detail?.genres).toEqual([])
  })

  it('keeps a minimal identity without inventing values', () => {
    const detail = mapMovieDetail(minimalMovieDetail(), artwork)?.detail
    expect(detail?.title).toBe('Minimal')
    expect(detail?.genres).toEqual([])
    expect(detail?.rating).toBeUndefined()
  })

  it('prefers an official trailer and ignores non-YouTube or malformed keys', () => {
    const detail = mapMovieDetail(
      completeMovieDetail({
        videos: {
          results: [
            { site: 'Vimeo', type: 'Trailer', key: 'abcdef12345', official: true },
            { site: 'YouTube', type: 'Teaser', key: 'abcdef12345', official: true },
            { site: 'YouTube', type: 'Trailer', key: 'x', official: true },
            { site: 'YouTube', type: 'Trailer', key: 'firstkey', official: false },
            { site: 'YouTube', type: 'Trailer', key: 'officialkey', official: true },
          ],
        },
      }),
      artwork
    )?.detail
    expect(detail?.trailer).toEqual({
      url: 'https://www.youtube.com/watch?v=officialkey',
      site: 'youtube',
    })
  })
})

describe('tv detail mapping', () => {
  it('maps the provider summary, episode runtime, and ordered seasons', () => {
    const detail = mapTvDetail(completeTvDetail(), artwork)?.detail
    expect(detail).toMatchObject({
      mediaType: 'tv',
      title: 'Dark',
      releaseDate: '2017-12-01',
      releaseYear: 2017,
      status: 'ended',
      episodeRuntime: { minMinutes: 45, maxMinutes: 60 },
      tvSummary: {
        seasonsCount: 3,
        episodesCount: 26,
        firstAirDate: '2017-12-01',
        latestAirDate: '2020-06-27',
        networks: ['Netflix'],
      },
    })
    expect(detail?.seasons?.map((season) => season.number)).toEqual([1, 2, 3, 0])
    expect(detail?.seasons?.[0]).toEqual({
      number: 1,
      name: 'Season 1',
      airYear: 2017,
      episodeCount: 10,
    })
    expect(detail).not.toHaveProperty('runtime')
  })

  it('does not construct a collection for tv', () => {
    const detail = mapTvDetail(completeTvDetail(), artwork)?.detail
    expect(detail).not.toHaveProperty('collection')
  })

  it('omits an empty tv summary and unusable seasons', () => {
    const detail = mapTvDetail(
      completeTvDetail({
        number_of_seasons: null,
        number_of_episodes: null,
        first_air_date: null,
        last_air_date: null,
        networks: [{ id: 1, name: 'N/A' }],
        seasons: [{ season_number: 99, name: 'N/A', air_date: '', episode_count: -1 }],
      }),
      artwork
    )?.detail
    expect(detail).not.toHaveProperty('tvSummary')
    expect(detail?.seasons).toEqual([{ number: 99 }])
  })

  it('applies the original-language overview fallback', () => {
    const detail = mapTvDetail(originalLanguageOnlyTv(), {
      ...artwork,
      fallbackOverview: 'Original overview.',
    })?.detail
    expect(detail?.overview).toBe('Original overview.')
  })
})

describe('detail de-duplication and bounds', () => {
  it('de-duplicates genres by provider id and seasons by number', () => {
    const movie = mapMovieDetail(
      completeMovieDetail({
        genres: [
          { id: 18, name: 'Drama' },
          { id: 18, name: 'Duplicate Drama' },
          { id: 53, name: 'Thriller' },
        ],
      })
    )?.detail
    expect(movie?.genres).toEqual([
      { id: '18', name: 'Drama' },
      { id: '53', name: 'Thriller' },
    ])

    const tv = mapTvDetail(
      completeTvDetail({
        seasons: [
          { season_number: 1, name: 'One' },
          { season_number: 1, name: 'Duplicate One' },
          { season_number: 2, name: 'Two' },
        ],
      })
    )?.detail
    expect(tv?.seasons?.map((season) => season.name)).toEqual(['One', 'Two'])
  })

  it('keeps a collection id without inventing a display name', () => {
    const mapped = mapMovieDetail(
      completeMovieDetail({ belongs_to_collection: { id: 100, name: 'N/A' } })
    )
    expect(mapped?.collectionProviderId).toBe(100)
    expect(mapped?.detail).not.toHaveProperty('collection')
  })

  it('never bounds or reorders provider seasons', () => {
    const tv = mapTvDetail(
      completeTvDetail({
        seasons: [
          { season_number: 10, name: 'Ten' },
          { season_number: 2, name: 'Two' },
          { season_number: 1, name: 'One' },
        ],
      })
    )?.detail
    expect(tv?.seasons?.map((season) => season.number)).toEqual([1, 2, 10])
  })

  it('bounds tv networks, removes duplicates, and ignores unusable names', () => {
    const tv = mapTvDetail(
      completeTvDetail({
        networks: [
          { id: 1, name: 'Netflix' },
          { id: 2, name: 'netflix' },
          { id: 3, name: 'N/A' },
          { id: 4, name: 'HBO' },
          { id: 5, name: 'BBC' },
          { id: 6, name: 'ARD' },
          { id: 7, name: 'ZDF' },
          { id: 8, name: 'ARTE' },
        ],
      })
    )?.detail
    expect(tv?.tvSummary?.networks).toEqual(['Netflix', 'HBO', 'BBC', 'ARD', 'ZDF'])
  })

  it('selects the first eligible trailer when none is official', () => {
    const detail = mapMovieDetail(
      completeMovieDetail({
        videos: {
          results: [
            { site: 'YouTube', type: 'Trailer', key: 'firstkey', official: false },
            { site: 'YouTube', type: 'Trailer', key: 'secondkey', official: null },
          ],
        },
      })
    )?.detail
    expect(detail?.trailer?.url).toContain('firstkey')
  })
})
