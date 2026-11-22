import { z } from 'zod'

import { createHttpClient } from '@/shared/api/httpClient'
import type { HttpClient } from '@/shared/api/httpClient'
import { getApiBaseUrl } from '@/shared/config/env'

import { catalogItemSchema } from '../model/catalogItem'
import type { MediaType } from '../model/catalogItem'
import type { InterfaceLanguage } from '../model/catalogLanguage'
import {
  catalogPageSchema,
  catalogResponseMetaSchema,
  catalogSectionCapabilitySchema,
} from '../model/catalogSection'
import type { SectionId } from '../model/catalogSection'
import { searchPageEnvelopeSchema } from '../model/searchPage'

const capabilitiesEnvelopeSchema = z.object({
  data: z.object({ sections: z.array(catalogSectionCapabilitySchema).readonly() }),
})

const pageEnvelopeSchema = z.object({
  data: catalogPageSchema,
  meta: catalogResponseMetaSchema,
})

const itemEnvelopeSchema = z.object({
  data: catalogItemSchema,
  meta: catalogResponseMetaSchema,
})

export type CapabilitiesBody = z.infer<typeof capabilitiesEnvelopeSchema>
export type SectionPageBody = z.infer<typeof pageEnvelopeSchema>
export type ItemBody = z.infer<typeof itemEnvelopeSchema>
export type SearchPageBody = z.infer<typeof searchPageEnvelopeSchema>

export interface SectionPageRequest {
  readonly mediaType: MediaType
  readonly section: SectionId
  readonly language: InterfaceLanguage
  readonly page: number
}

export interface ItemRequest {
  readonly mediaType: MediaType
  readonly itemId: string
  readonly language: InterfaceLanguage
}

export interface SearchPageRequest {
  readonly query: string
  readonly language: InterfaceLanguage
  readonly page: number
}

export interface CatalogClient {
  readonly getCapabilities: () => Promise<CapabilitiesBody>
  readonly getSectionPage: (request: SectionPageRequest) => Promise<SectionPageBody>
  readonly getItem: (request: ItemRequest) => Promise<ItemBody>
  readonly getSearchPage: (request: SearchPageRequest) => Promise<SearchPageBody>
}

export const createCatalogClient = (http: HttpClient): CatalogClient => {
  const getCapabilities = async (): Promise<CapabilitiesBody> => {
    const response = await http.get('/api/catalog/capabilities', capabilitiesEnvelopeSchema)
    return response.body
  }

  const getSectionPage = async ({
    mediaType,
    section,
    language,
    page,
  }: SectionPageRequest): Promise<SectionPageBody> => {
    const path = `/api/catalog/${mediaType}/${section}?language=${language}&page=${page}`
    const response = await http.get(path, pageEnvelopeSchema)
    return response.body
  }

  const getItem = async ({ mediaType, itemId, language }: ItemRequest): Promise<ItemBody> => {
    const path = `/api/catalog/${mediaType}/titles/${encodeURIComponent(itemId)}?language=${language}`
    const response = await http.get(path, itemEnvelopeSchema)
    return response.body
  }

  const getSearchPage = async ({
    query,
    language,
    page,
  }: SearchPageRequest): Promise<SearchPageBody> => {
    const path = `/api/search?query=${encodeURIComponent(query)}&language=${language}&page=${page}`
    const response = await http.get(path, searchPageEnvelopeSchema)
    return response.body
  }

  return Object.freeze({ getCapabilities, getSectionPage, getItem, getSearchPage })
}

let cachedCatalogClient: CatalogClient | null = null

export const getCatalogClient = (): CatalogClient => {
  if (cachedCatalogClient === null) {
    cachedCatalogClient = createCatalogClient(createHttpClient({ baseUrl: getApiBaseUrl() }))
  }
  return cachedCatalogClient
}

export const fetchCapabilities = (): Promise<CapabilitiesBody> =>
  getCatalogClient().getCapabilities()

export const fetchSectionPage = (request: SectionPageRequest): Promise<SectionPageBody> =>
  getCatalogClient().getSectionPage(request)

export const fetchItem = (request: ItemRequest): Promise<ItemBody> =>
  getCatalogClient().getItem(request)

export const fetchSearchPage = (request: SearchPageRequest): Promise<SearchPageBody> =>
  getCatalogClient().getSearchPage(request)
