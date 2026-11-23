import { createHttpClient } from '@/shared/api/httpClient'
import type { HttpClient } from '@/shared/api/httpClient'
import { getApiBaseUrl } from '@/shared/config/env'

import type { MediaType } from '../model/catalogItem'
import {
  availabilityEnvelopeSchema,
  availabilityRegionsEnvelopeSchema,
} from '../model/availability'
import type { AvailabilityEnvelope, AvailabilityRegionsEnvelope } from '../model/availability'

export interface AvailabilityRequest {
  readonly mediaType: MediaType
  readonly itemId: string
  readonly region: string
}

export interface AvailabilityClient {
  readonly getAvailability: (request: AvailabilityRequest) => Promise<AvailabilityEnvelope>
  readonly getRegions: () => Promise<AvailabilityRegionsEnvelope>
}

export const createAvailabilityClient = (http: HttpClient): AvailabilityClient => {
  const getAvailability = async ({
    mediaType,
    itemId,
    region,
  }: AvailabilityRequest): Promise<AvailabilityEnvelope> => {
    const path = `/api/catalog/${mediaType}/titles/${encodeURIComponent(
      itemId
    )}/availability?region=${encodeURIComponent(region)}`
    const response = await http.get(path, availabilityEnvelopeSchema)
    return response.body
  }

  const getRegions = async (): Promise<AvailabilityRegionsEnvelope> => {
    const response = await http.get(
      '/api/catalog/availability/regions',
      availabilityRegionsEnvelopeSchema
    )
    return response.body
  }

  return Object.freeze({ getAvailability, getRegions })
}

let cachedAvailabilityClient: AvailabilityClient | null = null

export const getAvailabilityClient = (): AvailabilityClient => {
  if (cachedAvailabilityClient === null) {
    cachedAvailabilityClient = createAvailabilityClient(
      createHttpClient({ baseUrl: getApiBaseUrl() })
    )
  }
  return cachedAvailabilityClient
}

export const fetchAvailability = (request: AvailabilityRequest): Promise<AvailabilityEnvelope> =>
  getAvailabilityClient().getAvailability(request)

export const fetchAvailabilityRegions = (): Promise<AvailabilityRegionsEnvelope> =>
  getAvailabilityClient().getRegions()
