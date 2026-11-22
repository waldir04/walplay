import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { createCorsMiddleware } from './cors.js'

const createResponse = () => {
  const headers = new Map<string, string>()
  const response = {
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value)
    }),
    status: vi.fn(),
    end: vi.fn(),
  }
  const status = response.status.mockReturnValue(response)
  void status
  return { response: response as unknown as Response, headers, raw: response }
}

describe('createCorsMiddleware', () => {
  const middleware = createCorsMiddleware({ allowedOrigins: ['http://localhost:5173'] })

  it('allows a configured origin and sets Vary', () => {
    const { response, headers } = createResponse()
    const next = vi.fn() as NextFunction

    middleware(
      { method: 'GET', headers: { origin: 'http://localhost:5173' } } as Request,
      response,
      next
    )

    expect(headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(headers.get('vary')).toBe('Origin')
    expect(headers.get('access-control-allow-methods')).toBe('GET,OPTIONS')
    expect(next).toHaveBeenCalled()
  })

  it('does not allow an unlisted origin', () => {
    const { response, headers } = createResponse()
    const next = vi.fn() as NextFunction

    middleware(
      { method: 'GET', headers: { origin: 'http://evil.example' } } as Request,
      response,
      next
    )

    expect(headers.has('access-control-allow-origin')).toBe(false)
    expect(next).toHaveBeenCalled()
  })

  it('answers a preflight safely', () => {
    const { response, headers, raw } = createResponse()
    const next = vi.fn() as NextFunction

    middleware(
      { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } } as Request,
      response,
      next
    )

    expect(raw.status).toHaveBeenCalledWith(204)
    expect(raw.end).toHaveBeenCalled()
    expect(headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(next).not.toHaveBeenCalled()
  })

  it('does not set credentials or wildcard headers', () => {
    const { response, headers } = createResponse()
    middleware(
      { method: 'GET', headers: { origin: 'http://localhost:5173' } } as Request,
      response,
      vi.fn() as NextFunction
    )

    expect(headers.has('access-control-allow-credentials')).toBe(false)
    expect(headers.get('access-control-allow-origin')).not.toBe('*')
  })
})
