import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { CatalogError } from '../domain/errors.js'
import { createErrorMiddleware, createNotFoundHandler } from './error.js'

const createResponse = () => {
  const response = {
    locals: { requestId: 'req-1' },
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response as unknown as Response
}

describe('error middleware', () => {
  it('maps a typed catalog error to the documented envelope', () => {
    const response = createResponse()
    createErrorMiddleware()(
      new CatalogError('CATALOG_RATE_LIMITED'),
      {} as Request,
      response,
      vi.fn() as NextFunction
    )

    expect(response.status).toHaveBeenCalledWith(429)
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'CATALOG_RATE_LIMITED',
        message: 'Catalog data is temporarily rate limited.',
      },
    })
  })

  it('maps unknown exceptions to INTERNAL_ERROR without leaking details', () => {
    const response = createResponse()
    createErrorMiddleware()(
      new Error('secret stack TMDB_ACCESS_TOKEN'),
      {} as Request,
      response,
      vi.fn() as NextFunction
    )

    const body = vi.mocked(response.json).mock.calls[0]?.[0]
    expect(response.status).toHaveBeenCalledWith(500)
    expect(JSON.stringify(body)).not.toContain('TMDB')
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('includes only safe validation details', () => {
    const response = createResponse()
    createErrorMiddleware()(
      new CatalogError('VALIDATION_ERROR', undefined, [{ path: 'page', code: 'too_small' }]),
      {} as Request,
      response,
      vi.fn() as NextFunction
    )

    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request could not be validated.',
        details: [{ path: 'page', code: 'too_small' }],
      },
    })
  })

  it('forwards an unknown route as ROUTE_NOT_FOUND', () => {
    const next = vi.fn()
    createNotFoundHandler()({} as Request, createResponse(), next as unknown as NextFunction)

    const error = next.mock.calls[0]?.[0]
    expect(error).toBeInstanceOf(CatalogError)
    expect((error as CatalogError).code).toBe('ROUTE_NOT_FOUND')
  })

  it('does not write after headers are sent', () => {
    const response = createResponse() as unknown as { headersSent: boolean }
    response.headersSent = true
    const typed = response as unknown as Response
    createErrorMiddleware()(
      new CatalogError('INTERNAL_ERROR'),
      {} as Request,
      typed,
      vi.fn() as NextFunction
    )
    expect(typed.json).not.toHaveBeenCalled()
  })
})
