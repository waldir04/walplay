import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

export const REQUEST_ID_HEADER = 'X-Request-Id'

export interface RequestWithId extends Request {
  requestId?: string
}

export const requestIdMiddleware = (
  request: RequestWithId,
  response: Response,
  next: NextFunction
): void => {
  const identifier = randomUUID()
  request.requestId = identifier
  response.locals.requestId = identifier
  response.setHeader(REQUEST_ID_HEADER, identifier)
  next()
}
