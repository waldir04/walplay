import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { requestIdMiddleware } from './requestId.js'

describe('requestIdMiddleware', () => {
  it('generates a correlation id, exposes it to handlers, and returns the header', () => {
    const request = {} as Request
    const setHeader = vi.fn()
    const response = { locals: {}, setHeader } as unknown as Response
    const next = vi.fn() as NextFunction

    requestIdMiddleware(request, response, next)

    expect(response.locals.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', response.locals.requestId)
    expect(next).toHaveBeenCalledWith()
  })

  it('generates a distinct id per request', () => {
    const ids = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const response = { locals: {}, setHeader: vi.fn() } as unknown as Response
      requestIdMiddleware({} as Request, response, vi.fn() as NextFunction)
      ids.add(response.locals.requestId as string)
    }
    expect(ids.size).toBe(5)
  })
})
