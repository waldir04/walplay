import type { NextFunction, Request, Response } from 'express'

import { CatalogError, isCatalogError } from '../domain/errors.js'
import type { Logger } from '../lib/logger.js'

interface ErrorBody {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: readonly unknown[]
  }
}

const statusClass = (status: number): '2xx' | '4xx' | '5xx' =>
  status >= 500 ? '5xx' : status >= 400 ? '4xx' : '2xx'

const toCatalogError = (error: unknown): CatalogError => {
  if (isCatalogError(error)) {
    return error
  }
  return new CatalogError('INTERNAL_ERROR')
}

export const createErrorMiddleware =
  (logger?: Logger) =>
  (error: unknown, request: Request, response: Response, _next: NextFunction): void => {
    const catalogError = toCatalogError(error)
    const requestId = response.locals.requestId as string | undefined

    logger?.error({
      requestId,
      route: request.path,
      outcome: 'failure',
      statusClass: statusClass(catalogError.status),
    })

    const body: ErrorBody = {
      error: {
        code: catalogError.code,
        message: catalogError.message,
        ...(catalogError.details === undefined ? {} : { details: catalogError.details }),
      },
    }

    if (response.headersSent) {
      return
    }

    response.status(catalogError.status).json(body)
  }

export const createNotFoundHandler =
  () =>
  (_request: Request, _response: Response, next: NextFunction): void => {
    next(new CatalogError('ROUTE_NOT_FOUND'))
  }
