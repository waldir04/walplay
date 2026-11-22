import type { CatalogItem } from '@/entities/catalog'

import { movieItem, secondMovieItem, tvItem } from './index'

export const itemWithoutPoster = (): CatalogItem => {
  const item = movieItem({ id: 'd2wxOm1vdmllOjY4MQ', title: 'No Artwork' })
  const { poster: _poster, ...rest } = item
  void _poster
  return rest
}

export const itemOnlyOriginalTitle = (): CatalogItem =>
  movieItem({
    id: 'd2wxOm1vdmllOjY4Mg',
    title: 'Original Only',
    originalTitle: undefined,
    releaseYear: undefined,
    rating: undefined,
    genres: [],
  })

export const itemWithLongSpanishTitle = (): CatalogItem =>
  movieItem({
    id: 'd2wxOm1vdmllOjY4Mw',
    title:
      'El extraordinariamente largo título de una película que debería ajustarse sin perder información',
  })

export const itemWithMissingMetadata = (): CatalogItem => {
  const {
    releaseYear: _year,
    rating: _rating,
    poster: _poster,
    ...rest
  } = movieItem({
    id: 'd2wxOm1vdmllOjY4NA',
    genres: [],
  })
  void _year
  void _rating
  void _poster
  return rest
}

export const invalidItemsByContract = [
  { id: 'short', mediaType: 'movie', title: 'Bad id', genres: [] },
  { id: secondMovieItem().id, mediaType: 'movie', title: '', genres: [] },
] as const

export const tvFixture = tvItem
