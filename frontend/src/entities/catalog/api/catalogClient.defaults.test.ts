import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { capabilitiesEnvelope, MOVIE_ID, movieItem, pageEnvelope } from '@/test/fixtures/catalog'

import { fetchCapabilities, fetchItem, fetchSectionPage, getCatalogClient } from './catalogClient'

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'X-Request-Id': 'req-default' },
  })

beforeEach(() => {
  vi.stubEnv('VITE_APP_ENV', 'local')
  vi.stubEnv('VITE_APP_VERSION', '1.0.0')
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/capabilities')) {
        return json(capabilitiesEnvelope())
      }
      if (url.includes('/titles/')) {
        return json({
          data: movieItem(),
          meta: pageEnvelope({ items: [] }).meta,
        })
      }
      return json(pageEnvelope({ items: [movieItem()] }))
    })
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('default catalog client', () => {
  it('creates one client instance from validated configuration', () => {
    expect(getCatalogClient()).toBe(getCatalogClient())
  })

  it('exposes convenience reads for capabilities, pages, and items', async () => {
    await expect(fetchCapabilities()).resolves.toMatchObject({
      data: { sections: expect.any(Array) },
    })
    await expect(
      fetchSectionPage({ mediaType: 'movie', section: 'popular', language: 'en', page: 1 })
    ).resolves.toMatchObject({ data: { items: expect.any(Array) } })
    await expect(
      fetchItem({ mediaType: 'movie', itemId: MOVIE_ID, language: 'en' })
    ).resolves.toMatchObject({ data: { title: 'Fight Club' } })
  })
})
