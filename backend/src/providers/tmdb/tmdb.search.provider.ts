import type { MediaType, ProviderLanguage } from '../../domain/catalog.js'
import type { ProviderSearchPage } from '../../domain/search.js'
import type { SearchProvider } from '../search-provider.js'
import type { TmdbClient } from './tmdb.client.js'
import type { ImageResolver } from './tmdb.images.js'
import { mapSearchResultsToItems } from './tmdb.search.mapper.js'
import { multiSearchResponseSchema } from './tmdb.search.schemas.js'

export interface TmdbSearchProviderDependencies {
  readonly client: TmdbClient
  readonly images: ImageResolver
  readonly genres: {
    readonly getGenreNames: (
      mediaType: MediaType,
      language: ProviderLanguage
    ) => Promise<ReadonlyMap<number, string>>
  }
}

export const createTmdbSearchProvider = ({
  client,
  images,
  genres,
}: TmdbSearchProviderDependencies): SearchProvider => {
  const fetchSearchPage: SearchProvider['fetchSearchPage'] = async ({
    query,
    language,
    page,
  }): Promise<ProviderSearchPage> => {
    const [movieGenreNames, tvGenreNames] = await Promise.all([
      genres.getGenreNames('movie', language),
      genres.getGenreNames('tv', language),
    ])
    await images.ensureReady()

    const response = await client.request(
      '/search/multi',
      { query, language, page, include_adult: 'false' },
      multiSearchResponseSchema
    )

    const items = mapSearchResultsToItems(response.results, {
      genreNamesByMediaType: { movie: movieGenreNames, tv: tvGenreNames },
      poster: (path) => images.resolvePoster(path),
    })

    return {
      page: response.page,
      items,
      ...(response.total_pages === undefined ? {} : { totalPages: response.total_pages }),
    }
  }

  return Object.freeze({ id: 'tmdb', fetchSearchPage })
}
