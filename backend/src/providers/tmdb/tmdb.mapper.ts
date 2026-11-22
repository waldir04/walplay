import type {
  CatalogGenre,
  CatalogItem,
  CatalogPoster,
  CatalogRating,
  MediaType,
} from '../../domain/catalog.js'
import { encodeItemId } from '../../lib/itemId.js'
import type { GenreNames } from './tmdb.genres.js'
import type { PosterResolver } from '../catalog-provider.js'

export interface ListItemMedia {
  readonly id: number
  readonly title?: string | null | undefined
  readonly name?: string | null | undefined
  readonly original_title?: string | null | undefined
  readonly original_name?: string | null | undefined
  readonly release_date?: string | null | undefined
  readonly first_air_date?: string | null | undefined
  readonly poster_path?: string | null | undefined
  readonly adult?: boolean | null | undefined
  readonly vote_average?: number | null | undefined
  readonly vote_count?: number | null | undefined
  readonly genre_ids?: readonly number[] | null | undefined
}

export interface DetailMedia {
  readonly id: number
  readonly title?: string | null | undefined
  readonly name?: string | null | undefined
  readonly original_title?: string | null | undefined
  readonly original_name?: string | null | undefined
  readonly release_date?: string | null | undefined
  readonly first_air_date?: string | null | undefined
  readonly poster_path?: string | null | undefined
  readonly adult?: boolean | null | undefined
  readonly vote_average?: number | null | undefined
  readonly vote_count?: number | null | undefined
  readonly genres?: readonly { readonly id: number; readonly name: string }[] | null | undefined
}

export interface ListMappingContext {
  readonly mediaType: MediaType
  readonly genreNames?: GenreNames
  readonly poster?: PosterResolver
}

export interface DetailMappingContext {
  readonly mediaType: MediaType
  readonly poster?: PosterResolver
}

const MIN_YEAR = 1888
const MAX_YEAR = 2100

const normalizeText = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const resolveTitle = (
  localized: string | null | undefined,
  original: string | null | undefined
): { readonly title: string; readonly originalTitle?: string } | null => {
  const localizedTitle = normalizeText(localized)
  const originalTitle = normalizeText(original)

  if (localizedTitle === undefined && originalTitle === undefined) {
    return null
  }

  const title = localizedTitle ?? originalTitle
  if (title === undefined) {
    return null
  }

  if (originalTitle !== undefined && originalTitle !== title) {
    return { title, originalTitle }
  }

  return { title }
}

export const extractReleaseYear = (value: string | null | undefined): number | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value.trim())
  if (!match || match[1] === undefined) {
    return undefined
  }
  const year = Number.parseInt(match[1], 10)
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return undefined
  }
  return year
}

export const buildRating = (
  average: number | null | undefined,
  voteCount: number | null | undefined
): CatalogRating | undefined => {
  if (
    typeof average !== 'number' ||
    !Number.isFinite(average) ||
    average < 0 ||
    average > 10 ||
    typeof voteCount !== 'number' ||
    !Number.isInteger(voteCount) ||
    voteCount <= 0
  ) {
    return undefined
  }

  return {
    value: Math.round(average * 10) / 10,
    voteCount,
    scale: 10,
  }
}

const resolveGenreNames = (
  names: readonly (readonly [number, string | null | undefined])[]
): readonly CatalogGenre[] => {
  const seen = new Set<number>()
  const genres: CatalogGenre[] = []

  for (const [id, name] of names) {
    const normalized = normalizeText(name)
    if (normalized === undefined || seen.has(id)) {
      continue
    }
    seen.add(id)
    genres.push({ id: String(id), name: normalized })
  }

  return genres
}

const mapGenresFromIds = (
  ids: readonly number[] | null | undefined,
  genreNames: GenreNames | undefined
): readonly CatalogGenre[] => {
  if (ids === null || ids === undefined || ids.length === 0 || genreNames === undefined) {
    return []
  }
  return resolveGenreNames(ids.map((id) => [id, genreNames.get(id)] as const))
}

const mapGenresFromList = (
  genres: readonly { readonly id: number; readonly name: string }[] | null | undefined
): readonly CatalogGenre[] => {
  if (genres === null || genres === undefined || genres.length === 0) {
    return []
  }
  return resolveGenreNames(genres.map((genre) => [genre.id, genre.name] as const))
}

const buildItem = (
  identity: { readonly id: number; readonly mediaType: MediaType },
  parts: {
    readonly title: string
    readonly originalTitle?: string
    readonly releaseYear?: number
    readonly rating?: CatalogRating
    readonly genres: readonly CatalogGenre[]
    readonly poster?: CatalogPoster
  }
): CatalogItem => ({
  id: encodeItemId(identity.mediaType, identity.id),
  mediaType: identity.mediaType,
  title: parts.title,
  ...(parts.originalTitle === undefined ? {} : { originalTitle: parts.originalTitle }),
  ...(parts.releaseYear === undefined ? {} : { releaseYear: parts.releaseYear }),
  ...(parts.rating === undefined ? {} : { rating: parts.rating }),
  genres: parts.genres,
  ...(parts.poster === undefined ? {} : { poster: parts.poster }),
})

export const mapListItemToItem = (
  raw: ListItemMedia,
  { mediaType, genreNames, poster }: ListMappingContext
): CatalogItem | null => {
  if (!Number.isSafeInteger(raw.id) || raw.id <= 0 || raw.adult === true) {
    return null
  }

  const isTv = mediaType === 'tv'
  const title = isTv
    ? resolveTitle(raw.name, raw.original_name)
    : resolveTitle(raw.title, raw.original_title)

  if (title === null) {
    return null
  }

  const date = isTv ? raw.first_air_date : raw.release_date
  const releaseYear = extractReleaseYear(date)
  const rating = buildRating(raw.vote_average, raw.vote_count)
  const resolvedPoster = poster?.(raw.poster_path)

  return buildItem(
    { id: raw.id, mediaType },
    {
      title: title.title,
      ...(title.originalTitle === undefined ? {} : { originalTitle: title.originalTitle }),
      ...(releaseYear === undefined ? {} : { releaseYear }),
      ...(rating === undefined ? {} : { rating }),
      genres: mapGenresFromIds(raw.genre_ids, genreNames),
      ...(resolvedPoster === undefined ? {} : { poster: resolvedPoster }),
    }
  )
}

export const mapDetailToItem = (
  raw: DetailMedia,
  { mediaType, poster }: DetailMappingContext
): CatalogItem | null => {
  if (!Number.isSafeInteger(raw.id) || raw.id <= 0 || raw.adult === true) {
    return null
  }

  const isTv = mediaType === 'tv'
  const title = isTv
    ? resolveTitle(raw.name, raw.original_name)
    : resolveTitle(raw.title, raw.original_title)

  if (title === null) {
    return null
  }

  const date = isTv ? raw.first_air_date : raw.release_date
  const releaseYear = extractReleaseYear(date)
  const rating = buildRating(raw.vote_average, raw.vote_count)
  const resolvedPoster = poster?.(raw.poster_path)

  return buildItem(
    { id: raw.id, mediaType },
    {
      title: title.title,
      ...(title.originalTitle === undefined ? {} : { originalTitle: title.originalTitle }),
      ...(releaseYear === undefined ? {} : { releaseYear }),
      ...(rating === undefined ? {} : { rating }),
      genres: mapGenresFromList(raw.genres),
      ...(resolvedPoster === undefined ? {} : { poster: resolvedPoster }),
    }
  )
}
