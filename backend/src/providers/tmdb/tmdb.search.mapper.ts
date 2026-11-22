import type {
  CatalogGenre,
  CatalogItem,
  CatalogPoster,
  CatalogRating,
  MediaType,
} from '../../domain/catalog.js'
import { encodeItemId } from '../../lib/itemId.js'
import type { PosterResolver } from '../catalog-provider.js'
import type { GenreNames } from './tmdb.genres.js'
import { buildRating, extractReleaseYear, resolveTitle } from './tmdb.mapper.js'
import type { MultiSearchItem } from './tmdb.search.schemas.js'

export interface SearchMappingContext {
  readonly genreNamesByMediaType: Readonly<Record<MediaType, GenreNames>>
  readonly poster?: PosterResolver
}

const isMediaType = (value: string | null | undefined): value is MediaType =>
  value === 'movie' || value === 'tv'

const resolveGenresFromIds = (
  ids: readonly number[] | null | undefined,
  genreNames: GenreNames
): readonly CatalogGenre[] => {
  if (ids === null || ids === undefined || ids.length === 0) {
    return []
  }

  const seen = new Set<number>()
  const genres: CatalogGenre[] = []

  for (const id of ids) {
    const name = genreNames.get(id)
    if (name === undefined || seen.has(id)) {
      continue
    }
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      continue
    }
    seen.add(id)
    genres.push({ id: String(id), name: trimmed })
  }

  return genres
}

export const mapSearchItemToItem = (
  raw: MultiSearchItem,
  { genreNamesByMediaType, poster }: SearchMappingContext
): CatalogItem | null => {
  if (raw.adult === true) {
    return null
  }

  if (!isMediaType(raw.media_type)) {
    return null
  }

  const mediaType = raw.media_type
  const id = raw.id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    return null
  }

  const isTv = mediaType === 'tv'
  const resolvedTitle = isTv
    ? resolveTitle(raw.name, raw.original_name)
    : resolveTitle(raw.title, raw.original_title)

  if (resolvedTitle === null) {
    return null
  }

  const date = isTv ? raw.first_air_date : raw.release_date
  const releaseYear = extractReleaseYear(date)
  const rating: CatalogRating | undefined = buildRating(raw.vote_average, raw.vote_count)
  const resolvedPoster: CatalogPoster | undefined = poster?.(raw.poster_path)

  return {
    id: encodeItemId(mediaType, id),
    mediaType,
    title: resolvedTitle.title,
    ...(resolvedTitle.originalTitle === undefined
      ? {}
      : { originalTitle: resolvedTitle.originalTitle }),
    ...(releaseYear === undefined ? {} : { releaseYear }),
    ...(rating === undefined ? {} : { rating }),
    genres: resolveGenresFromIds(raw.genre_ids, genreNamesByMediaType[mediaType]),
    ...(resolvedPoster === undefined ? {} : { poster: resolvedPoster }),
  }
}

export const mapSearchResultsToItems = (
  results: readonly MultiSearchItem[],
  context: SearchMappingContext
): readonly CatalogItem[] => {
  const seen = new Set<string>()
  const items: CatalogItem[] = []

  for (const raw of results) {
    const item = mapSearchItemToItem(raw, context)
    if (item === null || seen.has(item.id)) {
      continue
    }
    seen.add(item.id)
    items.push(item)
  }

  return items
}
