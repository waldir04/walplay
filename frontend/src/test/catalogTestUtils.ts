import { QueryClient } from '@tanstack/react-query'

import { catalogKeys } from '@/entities/catalog'
import type { CatalogItem, InterfaceLanguage, MediaType, SectionId } from '@/entities/catalog'

import { CAPABILITIES, capabilitiesEnvelope, pageEnvelope } from './fixtures/catalog'

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
      mutations: { retry: false },
    },
  })

export const primeCapabilities = (client: QueryClient): void => {
  client.setQueryData(catalogKeys.capabilities(), capabilitiesEnvelope())
}

export const primeSection = (
  client: QueryClient,
  mediaType: MediaType,
  section: SectionId,
  language: InterfaceLanguage,
  items: readonly CatalogItem[],
  options: { page?: number; hasMore?: boolean; totalPages?: number; stale?: boolean } = {}
): void => {
  client.setQueryData(
    catalogKeys.section(mediaType, section, language, options.page ?? 1),
    pageEnvelope({ items, section, ...options })
  )
}

export const primeCategory = (
  client: QueryClient,
  mediaType: MediaType,
  section: SectionId,
  language: InterfaceLanguage,
  pages: readonly ReturnType<typeof pageEnvelope>[]
): void => {
  client.setQueryData(catalogKeys.category(mediaType, section, language), {
    pages,
    pageParams: pages.map((page) => page.data.page),
  })
}

export const primeItem = (
  client: QueryClient,
  mediaType: MediaType,
  itemId: string,
  language: InterfaceLanguage,
  item: CatalogItem
): void => {
  client.setQueryData(catalogKeys.item(mediaType, itemId, language), {
    data: item,
    meta: {
      language: language === 'es' ? 'es-ES' : 'en-US',
      stale: false,
      lastUpdatedAt: '2026-11-22T15:00:00.000Z',
      source: 'provider',
    },
  })
}

export const primeAllSections = (
  client: QueryClient,
  mediaType: MediaType,
  language: InterfaceLanguage,
  items: readonly CatalogItem[]
): void => {
  primeCapabilities(client)
  for (const section of CAPABILITIES) {
    primeSection(client, mediaType, section.id, language, items)
  }
}
