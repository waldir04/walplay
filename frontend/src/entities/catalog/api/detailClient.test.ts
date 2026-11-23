import { describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@/shared/api/httpClient'

import {
  createDetailClient,
  fetchCollection,
  fetchCredits,
  fetchDetail,
  fetchSeason,
  fetchSimilar,
} from './detailClient'
import {
  collectionEnvelope,
  creditsEnvelope,
  detailEnvelope,
  seasonEnvelope,
  similarEnvelope,
} from '@/test/fixtures/detail'
import { afterEach } from 'vitest'

vi.mock('@/shared/config/env', () => ({
  getApiBaseUrl: () => 'https://api.example.test',
}))

const createLooseHttp = (body: unknown): { http: HttpClient; get: ReturnType<typeof vi.fn> } => {
  const get = vi.fn(async () => ({ body, requestId: 'request-1' }))
  return { http: { get } as unknown as HttpClient, get }
}

const createHttp = (body: unknown): { http: HttpClient; get: ReturnType<typeof vi.fn> } => {
  const get = vi.fn(
    async (
      _path: string,
      schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } }
    ) => {
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        throw new Error('Invalid response body.')
      }
      return { body: parsed.data, requestId: 'request-1' }
    }
  )
  return { http: { get } as unknown as HttpClient, get }
}

const request = { mediaType: 'movie', itemId: 'd2wxOm1vdmllOjU1MA', language: 'en' } as const

describe('detail client', () => {
  it('requests each surface with the required language parameter', async () => {
    const { http, get } = createLooseHttp(detailEnvelope())
    const client = createDetailClient(http)

    await client.getDetail(request)
    await client.getCredits(request)
    await client.getSimilar(request)
    await client.getCollection(request)
    await client.getSeason({ ...request, seasonNumber: 2 })

    expect(get.mock.calls.map((call) => call[0])).toEqual([
      '/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/detail?language=en',
      '/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/credits?language=en',
      '/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/similar?language=en',
      '/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/collection?language=en',
      '/api/catalog/movie/titles/d2wxOm1vdmllOjU1MA/seasons/2?language=en',
    ])
  })

  it('parses every documented envelope shape', async () => {
    for (const [body, call] of [
      [
        detailEnvelope(),
        (client: ReturnType<typeof createDetailClient>) => client.getDetail(request),
      ],
      [
        creditsEnvelope(),
        (client: ReturnType<typeof createDetailClient>) => client.getCredits(request),
      ],
      [
        similarEnvelope(),
        (client: ReturnType<typeof createDetailClient>) => client.getSimilar(request),
      ],
      [
        collectionEnvelope(),
        (client: ReturnType<typeof createDetailClient>) => client.getCollection(request),
      ],
      [
        seasonEnvelope(2),
        (client: ReturnType<typeof createDetailClient>) =>
          client.getSeason({ ...request, seasonNumber: 2 }),
      ],
    ] as const) {
      const { http } = createHttp(body)
      const client = createDetailClient(http)
      await expect(call(client)).resolves.toBeDefined()
    }
  })

  it('encodes the item id and passes the active language', async () => {
    const { http, get } = createLooseHttp(detailEnvelope())
    const client = createDetailClient(http)
    await client.getDetail({ mediaType: 'tv', itemId: 'abcDEF123', language: 'es' })
    expect(get).toHaveBeenCalledWith(
      '/api/catalog/tv/titles/abcDEF123/detail?language=es',
      expect.anything()
    )
  })

  it('rejects an envelope that fails the schema', async () => {
    const { http } = createHttp({ data: { title: '' }, meta: {} })
    const client = createDetailClient(http)
    await expect(client.getDetail(request)).rejects.toThrow()
  })
})

describe('module-level detail fetchers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes each wrapper through the cached client', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      const body = path.includes('/credits')
        ? creditsEnvelope()
        : path.includes('/similar')
          ? similarEnvelope()
          : path.includes('/collection')
            ? collectionEnvelope()
            : path.includes('/seasons/')
              ? seasonEnvelope(2)
              : detailEnvelope()
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchDetail(request)).resolves.toBeDefined()
    await expect(fetchCredits(request)).resolves.toBeDefined()
    await expect(fetchSimilar(request)).resolves.toBeDefined()
    await expect(fetchCollection(request)).resolves.toBeDefined()
    await expect(fetchSeason({ ...request, seasonNumber: 2 })).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})
