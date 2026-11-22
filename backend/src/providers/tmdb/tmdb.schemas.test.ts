import { describe, expect, it } from 'vitest'

import {
  imageConfigurationSchema,
  movieDetailSchema,
  movieListResponseSchema,
  tvDetailSchema,
  tvListResponseSchema,
} from './tmdb.schemas.js'

describe('tmdb schemas', () => {
  it('accepts a valid movie list page with nullable optional fields', () => {
    const result = movieListResponseSchema.safeParse({
      page: 1,
      results: [
        {
          id: 550,
          title: 'Fight Club',
          original_title: 'Fight Club',
          release_date: '1999-10-15',
          poster_path: null,
          adult: false,
          vote_average: 8.4,
          vote_count: 30_000,
          genre_ids: [18],
        },
      ],
      total_pages: 10,
      total_results: 200,
    })

    expect(result.success).toBe(true)
  })

  it('accepts TV list items and detail records', () => {
    const list = tvListResponseSchema.safeParse({
      page: 1,
      results: [
        {
          id: 1399,
          name: null,
          original_name: 'Example',
          first_air_date: '',
          poster_path: '/x.jpg',
          vote_average: 0,
          vote_count: 0,
        },
      ],
    })
    const detail = tvDetailSchema.safeParse({
      id: 1399,
      name: 'Example',
      original_name: 'Example',
      genres: [{ id: 18, name: 'Drama' }],
    })

    expect(list.success).toBe(true)
    expect(detail.success).toBe(true)
  })

  it('rejects malformed list and detail payloads', () => {
    expect(movieListResponseSchema.safeParse({ page: 'one', results: [] }).success).toBe(false)
    expect(movieListResponseSchema.safeParse({ page: 1 }).success).toBe(false)
    expect(movieDetailSchema.safeParse({ id: -1 }).success).toBe(false)
    expect(tvDetailSchema.safeParse({ id: 1, genres: [{ id: 'x', name: 'Drama' }] }).success).toBe(
      false
    )
  })

  it('accepts configuration and genre lists', () => {
    expect(
      imageConfigurationSchema.safeParse({
        images: { secure_base_url: 'https://image.example.test/t/p/', poster_sizes: ['w342'] },
      }).success
    ).toBe(true)
  })
})
