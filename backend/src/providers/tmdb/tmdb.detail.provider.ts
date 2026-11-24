import type { MediaType, ProviderLanguage } from '../../domain/catalog.js'
import type {
  Credits,
  RelatedCollection,
  RelatedTitle,
  SeasonEpisodes,
} from '../../domain/detail.js'
import type { DetailProvider, ProviderTitleDetail } from '../detail-provider.js'
import type { TmdbClient } from './tmdb.client.js'
import {
  aggregateCreditsDto,
  collectionDto,
  creditsDto,
  movieDetailDto,
  seasonDto,
  similarDto,
  tvDetailDto,
} from './tmdb.detail.schemas.js'
import {
  mapCollectionItems,
  mapMovieCredits,
  mapMovieDetail,
  mapSeasonEpisodes,
  mapSimilarItems,
  mapTvCredits,
  mapTvDetail,
  normalizeDescriptiveText,
} from './tmdb.detail.mapper.js'
import { ProviderHttpError } from './tmdb.errors.js'
import type { GenreNames } from './tmdb.genres.js'
import type { ImageResolver } from './tmdb.images.js'

export interface TmdbDetailProviderDependencies {
  readonly client: TmdbClient
  readonly images: ImageResolver
  readonly genres: {
    readonly getGenreNames: (
      mediaType: MediaType,
      language: ProviderLanguage
    ) => Promise<GenreNames>
  }
}

const EMPTY_CREDITS: Credits = Object.freeze({ cast: [], crew: [] })

const detailPath = (mediaType: MediaType, providerId: number): string =>
  `/${mediaType}/${providerId}`

const isNotFound = (error: unknown): boolean =>
  error instanceof ProviderHttpError && error.status === 404

const baseLanguage = (language: string): string => language.slice(0, 2).toLowerCase()

const needsOriginalLanguageFallback = (
  overview: string | null | undefined,
  originalLanguage: string | null | undefined,
  requestedLanguage: ProviderLanguage
): originalLanguage is string => {
  if (normalizeDescriptiveText(overview) !== undefined) {
    return false
  }
  if (typeof originalLanguage !== 'string' || originalLanguage.trim().length === 0) {
    return false
  }
  return baseLanguage(originalLanguage) !== baseLanguage(requestedLanguage)
}

export const createTmdbDetailProvider = ({
  client,
  images,
  genres,
}: TmdbDetailProviderDependencies): DetailProvider => {
  const artwork = () => ({
    poster: images.resolvePoster,
    backdrop: images.resolveBackdrop,
    profile: images.resolveProfile,
    still: images.resolveStill,
  })

  const fetchDetail: DetailProvider['fetchDetail'] = async ({
    mediaType,
    providerId,
    language,
  }): Promise<ProviderTitleDetail | null> => {
    await images.ensureReady()
    const path = detailPath(mediaType, providerId)

    try {
      if (mediaType === 'movie') {
        const raw = await client.request(
          path,
          { language },
          movieDetailDto
        )
        let fallback: { fallbackOverview?: string; fallbackTagline?: string } = {}
        if (needsOriginalLanguageFallback(raw.overview, raw.original_language, language)) {
          try {
            const alternate = await client.request(
              path,
              { language: raw.original_language },
              movieDetailDto
            )
            fallback = {
              ...(typeof alternate.overview === 'string'
                ? { fallbackOverview: alternate.overview }
                : {}),
              ...(typeof alternate.tagline === 'string'
                ? { fallbackTagline: alternate.tagline }
                : {}),
            }
          } catch {
            fallback = {}
          }
        }
        return mapMovieDetail(raw, { ...artwork(), ...fallback })
      }

      const raw = await client.request(
        path,
        { language },
        tvDetailDto
      )
      let fallback: { fallbackOverview?: string; fallbackTagline?: string } = {}
      if (needsOriginalLanguageFallback(raw.overview, raw.original_language, language)) {
        try {
          const alternate = await client.request(
            path,
            { language: raw.original_language },
            tvDetailDto
          )
          fallback = {
            ...(typeof alternate.overview === 'string'
              ? { fallbackOverview: alternate.overview }
              : {}),
            ...(typeof alternate.tagline === 'string'
              ? { fallbackTagline: alternate.tagline }
              : {}),
          }
        } catch {
          fallback = {}
        }
      }
      return mapTvDetail(raw, { ...artwork(), ...fallback })
    } catch (error) {
      if (isNotFound(error)) {
        return null
      }
      throw error
    }
  }

  const fetchCredits: DetailProvider['fetchCredits'] = async ({
    mediaType,
    providerId,
    language,
  }): Promise<Credits> => {
    await images.ensureReady()
    try {
      if (mediaType === 'movie') {
        const raw = await client.request(
          `${detailPath(mediaType, providerId)}/credits`,
          { language },
          creditsDto
        )
        return mapMovieCredits(raw, artwork())
      }
      const raw = await client.request(
        `${detailPath(mediaType, providerId)}/aggregate_credits`,
        { language },
        aggregateCreditsDto
      )
      return mapTvCredits(raw, artwork())
    } catch (error) {
      if (isNotFound(error)) {
        return EMPTY_CREDITS
      }
      throw error
    }
  }

  const fetchSimilar: DetailProvider['fetchSimilar'] = async ({
    mediaType,
    providerId,
    language,
  }): Promise<readonly RelatedTitle[]> => {
    await images.ensureReady()
    const genreNames = await genres.getGenreNames(mediaType, language)
    try {
      const raw = await client.request(
        `${detailPath(mediaType, providerId)}/similar`,
        { language, page: 1 },
        similarDto
      )
      return mapSimilarItems(raw, {
        mediaType,
        genreNames,
        poster: images.resolvePoster,
        currentProviderId: providerId,
      })
    } catch (error) {
      if (isNotFound(error)) {
        return []
      }
      throw error
    }
  }

  const fetchCollection: DetailProvider['fetchCollection'] = async ({
    providerId,
    language,
    collectionProviderId,
  }): Promise<RelatedCollection> => {
    await images.ensureReady()
    const genreNames = await genres.getGenreNames('movie', language)
    try {
      const raw = await client.request(
        `/collection/${collectionProviderId}`,
        { language },
        collectionDto
      )
      return mapCollectionItems(raw, {
        mediaType: 'movie',
        genreNames,
        poster: images.resolvePoster,
        currentProviderId: providerId,
      })
    } catch (error) {
      if (isNotFound(error)) {
        return { items: [] }
      }
      throw error
    }
  }

  const fetchSeason: DetailProvider['fetchSeason'] = async ({
    providerId,
    seasonNumber,
    language,
  }): Promise<SeasonEpisodes | null> => {
    await images.ensureReady()
    try {
      const raw = await client.request(
        `/tv/${providerId}/season/${seasonNumber}`,
        { language },
        seasonDto
      )
      return mapSeasonEpisodes(raw, {
        seasonNumber,
        still: images.resolveStill,
      })
    } catch (error) {
      if (isNotFound(error)) {
        return null
      }
      throw error
    }
  }

  return Object.freeze({
    id: 'tmdb',
    fetchDetail,
    fetchCredits,
    fetchSimilar,
    fetchCollection,
    fetchSeason,
  })
}
