import { describe, expect, it } from 'vitest'

import { mapSeasonEpisodes } from './tmdb.detail.mapper.js'
import { completeSeason, largeSeason } from '../../test/fixtures/tmdb/detail.js'

const artwork = {
  still: (path: string | null | undefined) =>
    typeof path === 'string' && path.trim() !== ''
      ? { url: `https://image.example.test/w300${path}` }
      : undefined,
}

describe('season episode mapping', () => {
  it('maps the header and episodes in provider order', () => {
    const mapped = mapSeasonEpisodes(completeSeason(), { seasonNumber: 1, still: artwork.still })
    expect(mapped.season).toEqual({
      number: 1,
      name: 'Season 1',
      airYear: 2017,
      episodeCount: 3,
    })
    expect(mapped.episodes.map((episode) => episode.number)).toEqual([1, 2, 3])
    expect(mapped.episodes[0]).toMatchObject({
      name: 'Episode 1',
      airDate: '2017-12-01',
      runtimeMinutes: 51,
      overview: 'In 2019, a man disappears.',
      rating: { value: 8.1, voteCount: 820, scale: 10, source: 'tmdb' },
    })
    expect(mapped.episodes[0]?.still?.url).toContain('/w300/still-1.jpg')
  })

  it('keeps a numbered episode without a name and drops an unnamed, numberless one', () => {
    const mapped = mapSeasonEpisodes(
      completeSeason({
        episodes: [
          { episode_number: 1, name: '', vote_average: 0, vote_count: 0 },
          { episode_number: null, name: '', air_date: null },
          { episode_number: 2, name: 'N/A' },
        ],
      }),
      { seasonNumber: 1, still: artwork.still }
    )
    expect(mapped.episodes).toEqual([
      { number: 1 },
      { number: 2 },
    ])
  })

  it('drops invalid numbers, dates, runtimes, and ratings', () => {
    const mapped = mapSeasonEpisodes(
      completeSeason({
        episodes: [
          {
            episode_number: 10_000,
            name: 'Out of range number',
            air_date: 'not-a-date',
            runtime: 0,
            vote_average: 11,
            vote_count: 10,
            still_path: '',
          },
        ],
      }),
      { seasonNumber: 3, still: artwork.still }
    )
    expect(mapped.episodes).toEqual([{ name: 'Out of range number' }])
    expect(mapped.season.number).toBe(1)
  })

  it('derives a year-only air date and falls back to the requested season number', () => {
    const mapped = mapSeasonEpisodes(
      {
        season_number: null,
        name: 'Specials',
        air_date: '2018',
        episodes: [{ episode_number: 0, name: 'Special', air_date: '2018' }],
      },
      { seasonNumber: 0, still: artwork.still }
    )
    expect(mapped.season).toEqual({
      number: 0,
      name: 'Specials',
      airYear: 2018,
      episodeCount: 1,
    })
    expect(mapped.episodes[0]?.airDate).toBe('2018')
  })

  it('renders a large season in provider order without truncation', () => {
    const mapped = mapSeasonEpisodes(largeSeason(), { seasonNumber: 2, still: artwork.still })
    expect(mapped.episodes).toHaveLength(60)
    expect(mapped.episodes[59]?.number).toBe(60)
  })
})
