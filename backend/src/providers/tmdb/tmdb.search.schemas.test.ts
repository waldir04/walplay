import { describe, expect, it } from 'vitest'

import { multiSearchItemSchema, multiSearchResponseSchema } from './tmdb.search.schemas.js'

const movieItem = {
  id: 550,
  media_type: 'movie',
  title: 'Fight Club',
  original_title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/poster.jpg',
  adult: false,
  vote_average: 8.4,
  vote_count: 30_123,
  genre_ids: [18],
}

describe('TMDB multi-search DTOs', () => {
  it('accepts a page with movie and TV candidates', () => {
    const result = multiSearchResponseSchema.safeParse({
      page: 1,
      results: [
        movieItem,
        {
          id: 1399,
          media_type: 'tv',
          name: 'Example Show',
          original_name: 'Example Show',
          first_air_date: '2011-04-17',
        },
        { id: 42, media_type: 'person', name: 'Someone' },
      ],
      total_pages: 20,
      total_results: 400,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.results).toHaveLength(3)
      expect(result.data.total_pages).toBe(20)
      expect(result.data.total_results).toBe(400)
    }
  })

  it('requires the page and results array', () => {
    expect(multiSearchResponseSchema.safeParse({ results: [] }).success).toBe(false)
    expect(multiSearchResponseSchema.safeParse({ page: 1 }).success).toBe(false)
  })

  it('treats pagination metadata as optional', () => {
    const result = multiSearchResponseSchema.safeParse({ page: 1, results: [] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.total_pages).toBeUndefined()
      expect(result.data.total_results).toBeUndefined()
    }
  })

  it('accepts items with optional or missing media fields for mapper-level exclusion', () => {
    for (const item of [
      {},
      { id: 1 },
      { id: 1, media_type: 'person' },
      { id: null, media_type: 'movie' },
      { id: 0, media_type: 'movie' },
    ]) {
      expect(multiSearchItemSchema.safeParse(item).success, JSON.stringify(item)).toBe(true)
    }
  })

  it('ignores unknown fields and never declares popularity', () => {
    const parsed = multiSearchItemSchema.parse({ ...movieItem, popularity: 61.5, extra: 'x' })

    expect(parsed).not.toHaveProperty('popularity')
    expect(parsed).not.toHaveProperty('extra')
  })
})
