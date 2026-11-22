import { z } from 'zod'

export const mediaTypeSchema = z.enum(['movie', 'tv'])
export type MediaType = z.infer<typeof mediaTypeSchema>

export const catalogRatingSchema = z.object({
  value: z.number().finite().min(0).max(10),
  voteCount: z.number().int().nonnegative(),
  scale: z.literal(10),
})
export type CatalogRating = z.infer<typeof catalogRatingSchema>

export const catalogGenreSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})
export type CatalogGenre = z.infer<typeof catalogGenreSchema>

export const catalogPosterSchema = z.object({
  url: z.url(),
  urlLarge: z.url().optional(),
})
export type CatalogPoster = z.infer<typeof catalogPosterSchema>

export const CATALOG_ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export const catalogItemSchema = z.object({
  id: z.string().regex(CATALOG_ITEM_ID_PATTERN),
  mediaType: mediaTypeSchema,
  title: z.string().trim().min(1),
  originalTitle: z.string().trim().min(1).optional(),
  releaseYear: z.number().int().min(1800).max(2100).optional(),
  rating: catalogRatingSchema.optional(),
  genres: z.array(catalogGenreSchema).readonly().default([]),
  poster: catalogPosterSchema.optional(),
})
export type CatalogItem = z.infer<typeof catalogItemSchema>

const ratingNumberFormatterCache = new Map<string, Intl.NumberFormat>()

const ratingFormatter = (locale: string): Intl.NumberFormat => {
  const cached = ratingNumberFormatterCache.get(locale)
  if (cached) {
    return cached
  }
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  ratingNumberFormatterCache.set(locale, formatter)
  return formatter
}

export const formatRatingValue = (value: number, locale: string): string =>
  ratingFormatter(locale).format(value)

export const formatReleaseYear = (year: number): string => String(year)

export const formatCount = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale).format(value)

export interface AccessibleNameLabels {
  readonly mediaTypeLabel: string
  readonly ratingTemplate: (value: string) => string
}

export const buildCatalogItemAccessibleName = (
  item: CatalogItem,
  locale: string,
  labels: AccessibleNameLabels
): string => {
  const parts = [item.title, labels.mediaTypeLabel]
  if (item.releaseYear !== undefined) {
    parts.push(formatReleaseYear(item.releaseYear))
  }
  if (item.rating !== undefined) {
    parts.push(labels.ratingTemplate(formatRatingValue(item.rating.value, locale)))
  }
  return parts.join(', ')
}
