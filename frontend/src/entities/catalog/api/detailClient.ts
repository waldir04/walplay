import { createHttpClient } from '@/shared/api/httpClient'
import type { HttpClient } from '@/shared/api/httpClient'
import { getApiBaseUrl } from '@/shared/config/env'

import type { MediaType } from '../model/catalogItem'
import type { InterfaceLanguage } from '../model/catalogLanguage'
import {
  collectionEnvelopeSchema,
  creditsEnvelopeSchema,
  detailEnvelopeSchema,
  relatedItemsEnvelopeSchema,
  seasonEnvelopeSchema,
} from '../model/titleDetail'
import type {
  CollectionEnvelope,
  CreditsEnvelope,
  DetailEnvelope,
  RelatedItemsEnvelope,
  SeasonEnvelope,
} from '../model/titleDetail'

export interface DetailRequest {
  readonly mediaType: MediaType
  readonly itemId: string
  readonly language: InterfaceLanguage
}

export interface SeasonRequest extends DetailRequest {
  readonly seasonNumber: number
}

export interface DetailClient {
  readonly getDetail: (request: DetailRequest) => Promise<DetailEnvelope>
  readonly getCredits: (request: DetailRequest) => Promise<CreditsEnvelope>
  readonly getSimilar: (request: DetailRequest) => Promise<RelatedItemsEnvelope>
  readonly getCollection: (request: DetailRequest) => Promise<CollectionEnvelope>
  readonly getSeason: (request: SeasonRequest) => Promise<SeasonEnvelope>
}

const titlePath = ({ mediaType, itemId, language }: DetailRequest, surface: string): string =>
  `/api/catalog/${mediaType}/titles/${encodeURIComponent(itemId)}/${surface}?language=${language}`

export const createDetailClient = (http: HttpClient): DetailClient => {
  const getDetail = async (request: DetailRequest): Promise<DetailEnvelope> => {
    const response = await http.get(titlePath(request, 'detail'), detailEnvelopeSchema)
    return response.body
  }

  const getCredits = async (request: DetailRequest): Promise<CreditsEnvelope> => {
    const response = await http.get(titlePath(request, 'credits'), creditsEnvelopeSchema)
    return response.body
  }

  const getSimilar = async (request: DetailRequest): Promise<RelatedItemsEnvelope> => {
    const response = await http.get(titlePath(request, 'similar'), relatedItemsEnvelopeSchema)
    return response.body
  }

  const getCollection = async (request: DetailRequest): Promise<CollectionEnvelope> => {
    const response = await http.get(titlePath(request, 'collection'), collectionEnvelopeSchema)
    return response.body
  }

  const getSeason = async ({
    seasonNumber,
    ...request
  }: SeasonRequest): Promise<SeasonEnvelope> => {
    const path = titlePath(request, `seasons/${seasonNumber}`)
    const response = await http.get(path, seasonEnvelopeSchema)
    return response.body
  }

  return Object.freeze({ getDetail, getCredits, getSimilar, getCollection, getSeason })
}

let cachedDetailClient: DetailClient | null = null

export const getDetailClient = (): DetailClient => {
  if (cachedDetailClient === null) {
    cachedDetailClient = createDetailClient(createHttpClient({ baseUrl: getApiBaseUrl() }))
  }
  return cachedDetailClient
}

export const fetchDetail = (request: DetailRequest): Promise<DetailEnvelope> =>
  getDetailClient().getDetail(request)

export const fetchCredits = (request: DetailRequest): Promise<CreditsEnvelope> =>
  getDetailClient().getCredits(request)

export const fetchSimilar = (request: DetailRequest): Promise<RelatedItemsEnvelope> =>
  getDetailClient().getSimilar(request)

export const fetchCollection = (request: DetailRequest): Promise<CollectionEnvelope> =>
  getDetailClient().getCollection(request)

export const fetchSeason = (request: SeasonRequest): Promise<SeasonEnvelope> =>
  getDetailClient().getSeason(request)
