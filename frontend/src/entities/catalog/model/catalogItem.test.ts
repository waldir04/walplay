import { describe, expect, it } from 'vitest'

import {
  buildCatalogItemAccessibleName,
  catalogItemSchema,
  formatRatingValue,
  formatReleaseYear,
} from './catalogItem'
import { movieItem } from '@/test/fixtures/catalog'
import { itemWithMissingMetadata } from '@/test/fixtures/catalog/incomplete'

describe('catalogItemSchema', () => {
  it('accepts a complete catalog item', () => {
    expect(catalogItemSchema.safeParse(movieItem()).success).toBe(true)
  })

  it('accepts omitted optional fields and empty genre lists', () => {
    expect(catalogItemSchema.safeParse(itemWithMissingMetadata()).success).toBe(true)
  })

  it('rejects invalid opaque ids, media types, blank titles, and out-of-range ratings', () => {
    expect(catalogItemSchema.safeParse(movieItem({ id: 'short' })).success).toBe(false)
    expect(catalogItemSchema.safeParse({ ...movieItem(), mediaType: 'book' }).success).toBe(false)
    expect(catalogItemSchema.safeParse(movieItem({ title: '   ' })).success).toBe(false)
    expect(
      catalogItemSchema.safeParse({
        ...movieItem(),
        rating: { value: 10.5, voteCount: 1, scale: 10 },
      }).success
    ).toBe(false)
    expect(
      catalogItemSchema.safeParse({
        ...movieItem(),
        rating: { value: 8, voteCount: 1, scale: 5 },
      }).success
    ).toBe(false)
  })

  it('rejects unknown media types and malformed poster URLs', () => {
    expect(
      catalogItemSchema.safeParse({
        ...movieItem(),
        poster: { url: 'not-a-url' },
      }).success
    ).toBe(false)
  })
})

describe('catalog item formatters', () => {
  it('formats ratings with one decimal per locale', () => {
    expect(formatRatingValue(8.4, 'en-US')).toBe('8.4')
    expect(formatRatingValue(8.4, 'es-ES')).toBe('8,4')
  })

  it('formats the year without date conversion', () => {
    expect(formatReleaseYear(1999)).toBe('1999')
  })

  it('builds an accessible name with title, media type, year, and out-of-10 rating', () => {
    const name = buildCatalogItemAccessibleName(movieItem(), 'en-US', {
      mediaTypeLabel: 'Movies',
      ratingTemplate: (value) => `${value} out of 10`,
    })
    expect(name).toBe('Fight Club, Movies, 1999, 8.4 out of 10')
  })

  it('omits optional values from the accessible name when absent', () => {
    const name = buildCatalogItemAccessibleName(itemWithMissingMetadata(), 'en-US', {
      mediaTypeLabel: 'Movies',
      ratingTemplate: (value) => `${value} out of 10`,
    })
    expect(name).toBe('Fight Club, Movies')
  })
})
