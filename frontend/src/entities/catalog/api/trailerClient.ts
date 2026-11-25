import { createHttpClient } from '@/shared/api/httpClient'
import type { HttpClient } from '@/shared/api/httpClient'
import { getApiBaseUrl } from '@/shared/config/env'

import type { MediaType } from '../model/catalogItem'
import { trailerEnvelopeSchema } from '../model/trailer'
import type { TrailerEnvelope } from '../model/trailer'

export interface TrailerRequest {
  readonly mediaType: MediaType
  readonly itemId: string
}

export interface TrailerClient {
  readonly getTrailers: (request: TrailerRequest) => Promise<TrailerEnvelope>
}

export const createTrailerClient = (http: HttpClient): TrailerClient => {
  const getTrailers = async ({ mediaType, itemId }: TrailerRequest): Promise<TrailerEnvelope> => {
    const path = `/api/catalog/${mediaType}/titles/${encodeURIComponent(itemId)}/videos`
    const response = await http.get(path, trailerEnvelopeSchema)
    return response.body
  }

  return Object.freeze({ getTrailers })
}

let cachedTrailerClient: TrailerClient | null = null

export const getTrailerClient = (): TrailerClient => {
  if (cachedTrailerClient === null) {
    cachedTrailerClient = createTrailerClient(createHttpClient({ baseUrl: getApiBaseUrl() }))
  }
  return cachedTrailerClient
}

export const fetchTrailers = (request: TrailerRequest): Promise<TrailerEnvelope> =>
  getTrailerClient().getTrailers(request)
