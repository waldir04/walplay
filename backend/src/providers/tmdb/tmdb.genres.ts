import type { MediaType, ProviderLanguage } from '../../domain/catalog.js'
import type { TmdbClient } from './tmdb.client.js'
import { genreListResponseSchema } from './tmdb.schemas.js'

export type GenreNames = ReadonlyMap<number, string>

export interface GenreResolver {
  readonly getGenreNames: (mediaType: MediaType, language: ProviderLanguage) => Promise<GenreNames>
}

const EMPTY_GENRES: GenreNames = new Map()

export const createGenreResolver = (client: TmdbClient): GenreResolver => {
  const cache = new Map<string, GenreNames>()
  const inFlight = new Map<string, Promise<GenreNames>>()

  const getGenreNames = async (
    mediaType: MediaType,
    language: ProviderLanguage
  ): Promise<GenreNames> => {
    const key = `${mediaType}:${language}`
    const cached = cache.get(key)
    if (cached) {
      return cached
    }

    const pending = inFlight.get(key)
    if (pending) {
      return pending
    }

    const load = async (): Promise<GenreNames> => {
      try {
        const response = await client.request(
          `/genre/${mediaType}/list`,
          { language },
          genreListResponseSchema
        )
        const names = new Map<number, string>()
        for (const genre of response.genres) {
          const name = genre.name.trim()
          if (name.length > 0) {
            names.set(genre.id, name)
          }
        }
        cache.set(key, names)
        return names
      } catch {
        return EMPTY_GENRES
      } finally {
        inFlight.delete(key)
      }
    }

    const promise = load()
    inFlight.set(key, promise)
    return promise
  }

  return Object.freeze({ getGenreNames })
}
