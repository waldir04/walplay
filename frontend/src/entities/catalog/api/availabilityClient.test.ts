import { describe, expect, it, vi } from 'vitest'

import { CatalogApiError } from '@/shared/api/httpClient'
import type { HttpClient } from '@/shared/api/httpClient'

import { availabilityEnvelopeSchema } from '../model/availability'
import { createAvailabilityClient } from './availabilityClient'

const responseFor = (body: unknown) => ({ body, requestId: 'request-id' })

const createHttp = (body: unknown): HttpClient => ({
  get: vi.fn(async () => responseFor(body)) as unknown as HttpClient['get'],
})

const envelope = {
  data: {
    state: 'available',
    region: 'CO',
    groups: [{ category: 'subscription', providers: [{ name: 'HBO Max' }] }],
  },
  meta: {
    stale: false,
    lastUpdatedAt: '2026-11-23T12:00:00.000Z',
    source: 'provider',
    freshness: 'current',
  },
}

describe('availability client', () => {
  it('requests the availability path with the region query and no language', async () => {
    const http = createHttp(envelope)
    const client = createAvailabilityClient(http)

    const body = await client.getAvailability({
      mediaType: 'movie',
      itemId: 'd2wxOm1vdmllOjU1MA',
      region: 'CO',
    })

    expect(body).toEqual(envelope)
    expect(http.get).toHaveBeenCalledTimes(1)
    const [path] = vi.mocked(http.get).mock.calls[0] ?? []
    expect(path).toBe('/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/availability?region=CO')
    expect(path).not.toContain('language')
  })

  it('encodes the item id and region defensively', async () => {
    const http = createHttp(envelope)
    const client = createAvailabilityClient(http)

    await client.getAvailability({ mediaType: 'tv', itemId: 'a b', region: 'CO' })

    const [path] = vi.mocked(http.get).mock.calls[0] ?? []
    expect(path).toBe('/api/catalog/tv/titles/a%20b/availability?region=CO')
  })

  it('requests the static regions list without parameters', async () => {
    const http = createHttp({ data: { regions: ['CO'] } })
    const client = createAvailabilityClient(http)

    const body = await client.getRegions()

    expect(body).toEqual({ data: { regions: ['CO'] } })
    expect(http.get).toHaveBeenCalledWith('/api/catalog/availability/regions', expect.anything())
  })

  it('propagates stable catalog errors from the transport', async () => {
    const error = new CatalogApiError('CATALOG_TIMEOUT')
    const http: HttpClient = {
      get: vi.fn(async () => {
        throw error
      }),
    }
    const client = createAvailabilityClient(http)

    await expect(
      client.getAvailability({ mediaType: 'movie', itemId: 'd2wxOm1vdmllOjU1MA', region: 'CO' })
    ).rejects.toBe(error)
  })

  it('parses every documented success example against the frontend contract', () => {
    const examples = [
      envelope,
      {
        data: {
          state: 'no-information',
          region: 'CO',
          groups: [],
          destination: {
            url: 'https://www.themoviedb.org/tv/1399-game-of-thrones/watch?locale=CO',
          },
        },
        meta: {
          stale: false,
          lastUpdatedAt: '2026-11-23T12:05:00.000Z',
          source: 'provider',
          freshness: 'current',
        },
      },
      { data: { state: 'unsupported-region', region: 'FR', groups: [] } },
      {
        data: {
          state: 'available',
          region: 'CO',
          groups: [{ category: 'free', providers: [{ name: 'Example Free Service' }] }],
        },
        meta: {
          stale: true,
          lastUpdatedAt: '2026-11-20T09:30:00.000Z',
          source: 'stale-cache',
          freshness: 'stale',
        },
      },
      {
        data: {
          state: 'available',
          region: 'CO',
          groups: [{ category: 'buy', providers: [{ name: 'Example Store' }] }],
        },
        meta: {
          stale: false,
          lastUpdatedAt: '2026-11-23T12:00:00.000Z',
          source: 'provider',
          freshness: 'current',
          sourceUpdatedAt: '2026-11-23T06:00:00.000Z',
        },
      },
    ]

    for (const example of examples) {
      expect(availabilityEnvelopeSchema.safeParse(example).success).toBe(true)
    }
  })
})
