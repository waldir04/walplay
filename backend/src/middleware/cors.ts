import type { NextFunction, Request, Response } from 'express'

export interface CorsOptions {
  readonly allowedOrigins: readonly string[]
}

const ALLOWED_METHODS = 'GET,OPTIONS'
const ALLOWED_HEADERS = 'Content-Type'

export const createCorsMiddleware = ({ allowedOrigins }: CorsOptions) => {
  const allowlist = new Set(allowedOrigins)

  return (request: Request, response: Response, next: NextFunction): void => {
    const origin = request.headers.origin
    response.setHeader('Vary', 'Origin')

    const isAllowed = typeof origin === 'string' && allowlist.has(origin)

    if (isAllowed) {
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
      response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
    }

    if (request.method === 'OPTIONS') {
      response.status(204).end()
      return
    }

    next()
  }
}
