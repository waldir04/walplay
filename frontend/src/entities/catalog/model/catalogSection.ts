import { z } from 'zod'

import { CATALOG_ITEM_ID_PATTERN, catalogItemSchema, mediaTypeSchema } from './catalogItem'

export const sectionIdSchema = z.enum(['trending', 'popular', 'top-rated'])
export type SectionId = z.infer<typeof sectionIdSchema>

export const catalogSectionCapabilitySchema = z.object({
  id: sectionIdSchema,
  order: z.number(),
  mediaTypes: z.array(mediaTypeSchema).readonly(),
  paginated: z.boolean(),
})
export type CatalogSectionCapability = z.infer<typeof catalogSectionCapabilitySchema>

export const catalogPageSchema = z.object({
  mediaType: mediaTypeSchema,
  section: sectionIdSchema,
  page: z.number().int().positive(),
  items: z.array(catalogItemSchema).readonly(),
  totalPages: z.number().int().nonnegative().optional(),
  totalResults: z.number().int().nonnegative().optional(),
  hasMore: z.boolean(),
})
export type CatalogPage = z.infer<typeof catalogPageSchema>

export const catalogResponseMetaSchema = z.object({
  language: z.enum(['en-US', 'es-ES']),
  stale: z.boolean(),
  lastUpdatedAt: z.string(),
  source: z.enum(['provider', 'cache', 'stale-cache']),
})
export type CatalogResponseMeta = z.infer<typeof catalogResponseMetaSchema>

export const MEDIA_TYPE_SLUGS: Readonly<Record<'movies' | 'tv-shows', 'movie' | 'tv'>> =
  Object.freeze({
    movies: 'movie',
    'tv-shows': 'tv',
  })

export const MEDIA_TYPE_TO_SLUG: Readonly<Record<'movie' | 'tv', 'movies' | 'tv-shows'>> =
  Object.freeze({
    movie: 'movies',
    tv: 'tv-shows',
  })

export type MediaTypeSlug = keyof typeof MEDIA_TYPE_SLUGS

export const CATEGORY_SLUGS: Readonly<Record<'popular' | 'top-rated', 'popular' | 'top-rated'>> =
  Object.freeze({
    popular: 'popular',
    'top-rated': 'top-rated',
  })

export type CategorySlug = keyof typeof CATEGORY_SLUGS

export const isMediaTypeSlug = (value: unknown): value is MediaTypeSlug =>
  value === 'movies' || value === 'tv-shows'

export const isCategorySlug = (value: unknown): value is CategorySlug =>
  value === 'popular' || value === 'top-rated'

export const mediaTypeFromSlug = (slug: MediaTypeSlug): 'movie' | 'tv' => MEDIA_TYPE_SLUGS[slug]

export const sectionFromCategorySlug = (slug: CategorySlug): SectionId => CATEGORY_SLUGS[slug]

export const browseLandingPath = (mediaType: 'movie' | 'tv'): string =>
  `/browse/${MEDIA_TYPE_TO_SLUG[mediaType]}`

export const categoryPath = (mediaType: 'movie' | 'tv', category: CategorySlug): string =>
  `/browse/${MEDIA_TYPE_TO_SLUG[mediaType]}/${category}`

export const titleDetailPath = (mediaType: 'movie' | 'tv', itemId: string): string =>
  `/browse/${MEDIA_TYPE_TO_SLUG[mediaType]}/title/${itemId}`

export const SECTION_LABEL_KEYS: Readonly<Record<SectionId, string>> = Object.freeze({
  trending: 'catalog.sections.trending',
  popular: 'catalog.sections.popular',
  'top-rated': 'catalog.sections.topRated',
})

export const CATEGORY_LABEL_KEYS: Readonly<Record<CategorySlug, string>> = Object.freeze({
  popular: 'catalog.category.popular',
  'top-rated': 'catalog.category.topRated',
})

export type CatalogPath =
  | { readonly kind: 'landing'; readonly mediaType: 'movie' | 'tv' }
  | {
      readonly kind: 'category'
      readonly mediaType: 'movie' | 'tv'
      readonly category: CategorySlug
    }
  | {
      readonly kind: 'detail'
      readonly mediaType: 'movie' | 'tv'
      readonly itemId: string
    }
  | { readonly kind: 'unknown' }

export const parseCatalogPath = (pathname: string): CatalogPath => {
  const [root, mediaSlug, third, fourth] = pathname.split('/').filter(Boolean)

  if (root !== 'browse' || !isMediaTypeSlug(mediaSlug)) {
    return { kind: 'unknown' }
  }

  const mediaType = mediaTypeFromSlug(mediaSlug)

  if (third === undefined) {
    return { kind: 'landing', mediaType }
  }

  if (isCategorySlug(third) && fourth === undefined) {
    return { kind: 'category', mediaType, category: third }
  }

  if (third === 'title' && fourth !== undefined && CATALOG_ITEM_ID_PATTERN.test(fourth)) {
    return { kind: 'detail', mediaType, itemId: fourth }
  }

  return { kind: 'unknown' }
}
