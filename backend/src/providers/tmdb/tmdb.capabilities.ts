import type { CatalogSectionCapability } from '../../domain/catalog.js'

export const TMDB_CAPABILITIES: readonly CatalogSectionCapability[] = Object.freeze([
  Object.freeze({
    id: 'trending',
    order: 1,
    mediaTypes: Object.freeze(['movie', 'tv'] as const),
    paginated: false,
  }),
  Object.freeze({
    id: 'popular',
    order: 2,
    mediaTypes: Object.freeze(['movie', 'tv'] as const),
    paginated: true,
  }),
  Object.freeze({
    id: 'top-rated',
    order: 3,
    mediaTypes: Object.freeze(['movie', 'tv'] as const),
    paginated: true,
  }),
])
