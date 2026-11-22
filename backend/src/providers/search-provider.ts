import type { ProviderLanguage } from '../domain/catalog.js'
import type { ProviderSearchPage } from '../domain/search.js'

export interface SearchProvider {
  readonly id: 'tmdb'
  readonly fetchSearchPage: (input: {
    readonly query: string
    readonly language: ProviderLanguage
    readonly page: number
  }) => Promise<ProviderSearchPage>
}
