import type {
  CatalogSectionCapability,
  MediaType,
  ProviderLanguage,
  SectionId,
} from '../../domain/catalog.js'
import type { CatalogItem, ProviderSectionPage } from '../../domain/catalog.js'
import type { CatalogProvider, PosterResolver } from '../catalog-provider.js'
import { TMDB_CAPABILITIES } from './tmdb.capabilities.js'
import type { TmdbClient } from './tmdb.client.js'
import { ProviderHttpError } from './tmdb.errors.js'
import type { GenreNames } from './tmdb.genres.js'
import type { ImageResolver } from './tmdb.images.js'
import { mapDetailToItem, mapListItemToItem } from './tmdb.mapper.js'
import {
  movieDetailSchema,
  movieListResponseSchema,
  tvDetailSchema,
  tvListResponseSchema,
} from './tmdb.schemas.js'

export interface TmdbProviderDependencies {
  readonly client: TmdbClient
  readonly images: ImageResolver
  readonly genres: {
    readonly getGenreNames: (
      mediaType: MediaType,
      language: ProviderLanguage
    ) => Promise<GenreNames>
  }
}

const listPath = (mediaType: MediaType, section: SectionId): string => {
  if (section === 'trending') {
    return `/trending/${mediaType}/week`
  }
  const collection = section === 'popular' ? 'popular' : 'top_rated'
  return `/${mediaType}/${collection}`
}

const detailPath = (mediaType: MediaType, providerId: number): string =>
  `/${mediaType}/${providerId}`

export const createTmdbProvider = ({
  client,
  images,
  genres,
}: TmdbProviderDependencies): CatalogProvider => {
  const capabilities = (): Promise<readonly CatalogSectionCapability[]> =>
    Promise.resolve(TMDB_CAPABILITIES)

  const fetchSectionPage: CatalogProvider['fetchSectionPage'] = async ({
    mediaType,
    section,
    language,
    page,
  }) => {
    const effectivePage = section === 'trending' ? 1 : page
    const params = section === 'trending' ? { language } : { language, page: effectivePage }

    const [genreNames] = await Promise.all([
      genres.getGenreNames(mediaType, language),
      images.ensureReady(),
    ])

    const poster: PosterResolver = (path) => images.resolvePoster(path)

    if (mediaType === 'movie') {
      const response = await client.request(
        listPath(mediaType, section),
        params,
        movieListResponseSchema
      )
      const items = response.results
        .map((raw) =>
          mapListItemToItem(raw, {
            mediaType,
            genreNames,
            poster,
          })
        )
        .filter((item): item is CatalogItem => item !== null)

      return {
        page: effectivePage,
        items,
        ...(response.total_pages === undefined ? {} : { totalPages: response.total_pages }),
        ...(response.total_results === undefined ? {} : { totalResults: response.total_results }),
      } satisfies ProviderSectionPage
    }

    const response = await client.request(
      listPath(mediaType, section),
      params,
      tvListResponseSchema
    )
    const items = response.results
      .map((raw) =>
        mapListItemToItem(raw, {
          mediaType,
          genreNames,
          poster,
        })
      )
      .filter((item): item is CatalogItem => item !== null)

    return {
      page: effectivePage,
      items,
      ...(response.total_pages === undefined ? {} : { totalPages: response.total_pages }),
      ...(response.total_results === undefined ? {} : { totalResults: response.total_results }),
    } satisfies ProviderSectionPage
  }

  const fetchItem: CatalogProvider['fetchItem'] = async ({ mediaType, providerId, language }) => {
    await images.ensureReady()
    const poster: PosterResolver = (path) => images.resolvePoster(path)

    try {
      if (mediaType === 'movie') {
        const response = await client.request(
          detailPath(mediaType, providerId),
          { language },
          movieDetailSchema
        )
        return mapDetailToItem(response, { mediaType, poster })
      }

      const response = await client.request(
        detailPath(mediaType, providerId),
        { language },
        tvDetailSchema
      )
      return mapDetailToItem(response, { mediaType, poster })
    } catch (error) {
      if (error instanceof ProviderHttpError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  return Object.freeze({ id: 'tmdb', capabilities, fetchSectionPage, fetchItem })
}
