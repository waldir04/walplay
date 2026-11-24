import { describe, expect, it } from 'vitest'

import { MOVIE_ID, movieItem, tvItem } from '@/test/fixtures/catalog'
import { movieDetail } from '@/test/fixtures/detail'

import { toSavedSnapshot } from './toSavedSnapshot'

describe('toSavedSnapshot', () => {
  it('converts a catalog item into a stored snapshot input', () => {
    expect(toSavedSnapshot(movieItem())).toEqual({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      title: 'Fight Club',
      originalTitle: 'Fight Club',
      releaseYear: 1999,
      poster: {
        url: 'https://image.example.test/w342/fight-club.jpg',
        urlLarge: 'https://image.example.test/w780/fight-club.jpg',
      },
    })
  })

  it('converts a title detail and omits absent optional fields', () => {
    const snapshot = toSavedSnapshot(
      movieDetail({ originalTitle: undefined, releaseYear: undefined, poster: undefined })
    )

    expect(snapshot).toEqual({
      mediaType: 'movie',
      itemId: MOVIE_ID,
      title: 'Fight Club',
    })
    expect('originalTitle' in snapshot).toBe(false)
    expect('releaseYear' in snapshot).toBe(false)
    expect('poster' in snapshot).toBe(false)
  })

  it('keeps television identity and media type', () => {
    const snapshot = toSavedSnapshot(tvItem())
    expect(snapshot.mediaType).toBe('tv')
    expect(snapshot.itemId).toBe(tvItem().id)
  })
})
