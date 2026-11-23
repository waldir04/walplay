import express from 'express'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDetailController } from './detail.controller.js'
import { createErrorMiddleware } from '../middleware/error.js'
import { createDetailRouter } from '../routes/detail.routes.js'
import { createTestDetailService } from '../test/fixtures/fakeDetailProvider.js'
import { startTestServer } from '../test/fixtures/testServer.js'
import type { TestServer } from '../test/fixtures/testServer.js'
import { encodeItemId } from '../lib/itemId.js'

let server: TestServer
const movieId = encodeItemId('movie', 550)
const tvId = encodeItemId('tv', 213)

beforeEach(async () => {
  const app = express()
  app.use('/api/catalog', createDetailRouter(createDetailController(createTestDetailService())))
  app.use(createErrorMiddleware())
  server = await startTestServer(app)
})

afterEach(async () => {
  await server.close()
})

describe('detail controller', () => {
  it('returns a data and meta envelope for each surface', async () => {
    for (const [path, key] of [
      [`/api/catalog/movie/titles/${movieId}/detail?language=en`, 'title'],
      [`/api/catalog/movie/titles/${movieId}/credits?language=en`, 'cast'],
      [`/api/catalog/movie/titles/${movieId}/similar?language=en`, 'items'],
      [`/api/catalog/movie/titles/${movieId}/collection?language=en`, 'items'],
      [`/api/catalog/tv/titles/${tvId}/seasons/1?language=en`, 'episodes'],
    ] as const) {
      const response = await fetch(`${server.baseUrl}${path}`)
      const body = (await response.json()) as {
        data: Record<string, unknown>
        meta: Record<string, unknown>
      }
      expect(response.status).toBe(200)
      expect(body.data).toHaveProperty(key)
      expect(body.meta).toMatchObject({ language: 'en-US', stale: false })
    }
  })

  it('rejects unknown query parameters', async () => {
    const response = await fetch(
      `${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail?language=en&page=2`
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('rejects a missing language', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/${movieId}/detail`)
    expect(response.status).toBe(400)
  })

  it('rejects an out-of-range or non-integer season path parameter', async () => {
    for (const season of ['9999', 'abc', '-1', '1.5']) {
      const response = await fetch(
        `${server.baseUrl}/api/catalog/tv/titles/${tvId}/seasons/${season}?language=en`
      )
      expect(response.status).toBe(400)
    }
  })

  it('rejects a malformed item id before decoding', async () => {
    const response = await fetch(`${server.baseUrl}/api/catalog/movie/titles/short/detail?language=en`)
    expect(response.status).toBe(400)
  })
})
