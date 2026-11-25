import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import { encodeItemId } from '../lib/itemId.js'
import { createErrorMiddleware } from '../middleware/error.js'
import { createFakeTrailerProvider, createTestTrailerService } from '../test/fixtures/fakeTrailerProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'
import { createTrailerController } from './trailer.controller.js'
import { createTrailerRouter } from '../routes/trailer.routes.js'

let server: TestServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

const buildApp = (provider = createFakeTrailerProvider()) => {
  const app = express()
  app.use(
    '/api/catalog',
    createTrailerRouter(createTrailerController(createTestTrailerService(provider)))
  )
  app.use(createErrorMiddleware())
  return app
}

const path = (mediaType: 'movie' | 'tv' = 'movie', providerId = 550) =>
  `/api/catalog/${mediaType}/titles/${encodeItemId(mediaType, providerId)}/videos`

describe('trailer controller', () => {
  it('returns the envelope, no-store, and a request id', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as { data: { state: string }; meta: unknown }

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.data.state).toBe('available')
    expect(body.meta).toBeDefined()
  })

  it('rejects a malformed item id with VALIDATION_ERROR', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/short/videos`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a media type that does not match the encoded item id', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(
      `${server.baseUrl}/api/catalog/tv/titles/${encodeItemId('movie', 550)}/videos`
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('CATALOG_NOT_FOUND')
  })

  it('rejects any query parameter', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${path()}?language=en`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns CATALOG_NOT_FOUND when the provider reports no title', async () => {
    const provider = createFakeTrailerProvider()
    provider.fetchTrailers.mockResolvedValueOnce(null)
    server = await startTestServer(buildApp(provider))

    const response = await fetch(`${server.baseUrl}${path()}`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('CATALOG_NOT_FOUND')
  })

  it('never exposes provider identifiers or stream data', async () => {
    server = await startTestServer(buildApp())

    const response = await fetch(`${server.baseUrl}${path()}`)
    const text = await response.text()

    expect(text).not.toContain('550')
    expect(text).not.toContain('api.example.test')
    expect(text).not.toContain('test-token')
    expect(text).not.toMatch(/\.m3u8|\.mp4/)
  })
})
