import { describe, expect, it } from 'vitest'

import {
  adultMovie,
  movieWithNoPoster,
  movieWithUnknownGenres,
} from '../../test/fixtures/tmdb/incomplete.js'
import { movieListItem } from '../../test/fixtures/tmdb/listPages.js'
import { mapListItemToItem } from './tmdb.mapper.js'

const genreNames = new Map([[18, 'Drama']])
const poster = (path: string | null | undefined) =>
  path ? { url: `https://image.example.test/w342${path}` } : undefined

describe('genre, poster, adult, and identity rules', () => {
  it('resolves known localized genre names and omits unknown ids', () => {
    const item = mapListItemToItem(movieListItem(), { mediaType: 'movie', genreNames })
    expect(item?.genres).toEqual([{ id: '18', name: 'Drama' }])

    const unknown = mapListItemToItem(movieWithUnknownGenres(), { mediaType: 'movie', genreNames })
    expect(unknown?.genres).toEqual([])
  })

  it('omits artwork when configuration or path is unavailable', () => {
    expect(
      mapListItemToItem(movieWithNoPoster(), { mediaType: 'movie', poster })?.poster
    ).toBeUndefined()
    expect(mapListItemToItem(movieListItem(), { mediaType: 'movie' })?.poster).toBeUndefined()
  })

  it('composes artwork only from the boundary resolver', () => {
    expect(mapListItemToItem(movieListItem(), { mediaType: 'movie', poster })?.poster).toEqual({
      url: 'https://image.example.test/w342/fight-club.jpg',
    })
  })

  it('excludes adult items before mapping', () => {
    expect(mapListItemToItem(adultMovie(), { mediaType: 'movie' })).toBeNull()
  })

  it('drops items without valid identity', () => {
    expect(mapListItemToItem(movieListItem({ id: 0 }), { mediaType: 'movie' })).toBeNull()
    expect(mapListItemToItem(movieListItem({ id: -1 }), { mediaType: 'movie' })).toBeNull()
  })
})
