import type { CatalogItem } from '@/entities/catalog/model/catalogItem'
import type { SearchPageEnvelope } from '@/entities/catalog/model/searchPage'

import { errorEnvelope, movieItem, providerMeta, tvItem } from './index'

export const SEARCH_QUERY = 'the matrix'

export const searchPageEnvelope = (input: {
  readonly items: readonly CatalogItem[]
  readonly page?: number
  readonly hasMore?: boolean
  readonly totalPages?: number
  readonly stale?: boolean
  readonly lastUpdatedAt?: string
}): SearchPageEnvelope => ({
  data: {
    page: input.page ?? 1,
    items: input.items,
    hasMore: input.hasMore ?? false,
    ...(input.totalPages === undefined ? {} : { totalPages: input.totalPages }),
  },
  meta: providerMeta({
    ...(input.stale === true ? { stale: true, source: 'stale-cache' as const } : {}),
    ...(input.lastUpdatedAt === undefined ? {} : { lastUpdatedAt: input.lastUpdatedAt }),
  }),
})

export const firstSearchPage = (): SearchPageEnvelope =>
  searchPageEnvelope({
    items: [movieItem({ title: 'The Matrix' }), tvItem({ title: 'The Matrix Show' })],
    page: 1,
    hasMore: true,
    totalPages: 3,
  })

export const secondSearchPage = (): SearchPageEnvelope =>
  searchPageEnvelope({
    items: [movieItem({ id: 'd2wxOm1vdmllOjYwMw', title: 'The Matrix Reloaded' })],
    page: 2,
    hasMore: true,
    totalPages: 3,
  })

export const finalSearchPage = (): SearchPageEnvelope =>
  searchPageEnvelope({
    items: [movieItem({ id: 'd2wxOm1vdmllOjYwNQ', title: 'The Matrix Revolutions' })],
    page: 3,
    hasMore: false,
    totalPages: 3,
  })

export const emptyButMorePage = (): SearchPageEnvelope =>
  searchPageEnvelope({ items: [], page: 2, hasMore: true, totalPages: 3 })

export const emptyFinalPage = (): SearchPageEnvelope =>
  searchPageEnvelope({ items: [], page: 1, hasMore: false, totalPages: 1 })

export const allInvalidPage = (): SearchPageEnvelope =>
  searchPageEnvelope({ items: [], page: 1, hasMore: true, totalPages: 2 })

export const searchErrorEnvelope = errorEnvelope
