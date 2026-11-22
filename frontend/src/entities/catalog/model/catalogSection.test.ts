import { describe, expect, it } from 'vitest'

import {
  browseLandingPath,
  catalogPageSchema,
  categoryPath,
  isCategorySlug,
  isMediaTypeSlug,
  mediaTypeFromSlug,
  parseCatalogPath,
  sectionFromCategorySlug,
  titleDetailPath,
} from './catalogSection'
import { MOVIE_ID, catalogPage, movieItem } from '@/test/fixtures/catalog'

describe('catalogSection models', () => {
  it('accepts a page with required hasMore and optional totals', () => {
    expect(catalogPageSchema.safeParse(catalogPage({ items: [movieItem()] })).success).toBe(true)
    expect(
      catalogPageSchema.safeParse({ ...catalogPage({ items: [] }), hasMore: undefined }).success
    ).toBe(false)
  })

  it('maps media type slugs and category slugs', () => {
    expect(isMediaTypeSlug('movies')).toBe(true)
    expect(isMediaTypeSlug('tv-shows')).toBe(true)
    expect(isMediaTypeSlug('movie')).toBe(false)
    expect(mediaTypeFromSlug('movies')).toBe('movie')
    expect(mediaTypeFromSlug('tv-shows')).toBe('tv')
    expect(isCategorySlug('popular')).toBe(true)
    expect(isCategorySlug('trending')).toBe(false)
    expect(sectionFromCategorySlug('top-rated')).toBe('top-rated')
  })

  it('builds stable catalog addresses', () => {
    expect(browseLandingPath('movie')).toBe('/browse/movies')
    expect(categoryPath('tv', 'popular')).toBe('/browse/tv-shows/popular')
    expect(titleDetailPath('movie', MOVIE_ID)).toBe(`/browse/movies/title/${MOVIE_ID}`)
  })

  it('parses landing, category, and detail paths', () => {
    expect(parseCatalogPath('/browse/movies')).toEqual({ kind: 'landing', mediaType: 'movie' })
    expect(parseCatalogPath('/browse/tv-shows')).toEqual({ kind: 'landing', mediaType: 'tv' })
    expect(parseCatalogPath('/browse/movies/popular')).toEqual({
      kind: 'category',
      mediaType: 'movie',
      category: 'popular',
    })
    expect(parseCatalogPath(`/browse/tv-shows/title/${MOVIE_ID}`)).toEqual({
      kind: 'detail',
      mediaType: 'tv',
      itemId: MOVIE_ID,
    })
  })

  it('rejects unknown catalog paths', () => {
    for (const path of [
      '/browse',
      '/browse/films',
      '/browse/movies/trending',
      '/browse/movies/popular/extra',
      '/browse/movies/title/short',
      '/elsewhere',
    ]) {
      expect(parseCatalogPath(path), path).toEqual({ kind: 'unknown' })
    }
  })
})
