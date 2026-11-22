import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { z } from 'zod'

import { validationError } from '../domain/errors.js'
import {
  SEARCH_QUERY_MAX_CODE_POINTS,
  SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS,
  SEARCH_MAX_REQUEST_PAGE,
  countCodePoints,
  countNonWhitespaceCharacters,
} from '../domain/search.js'
import { toProviderLanguage } from '../providers/tmdb/tmdb.language.js'
import type { SearchService } from '../services/search.service.js'

const languageSchema = z.enum(['en', 'es'])
const pageSchema = z.coerce.number().int().min(1).max(SEARCH_MAX_REQUEST_PAGE)

export const searchQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .refine(
        (value) => countNonWhitespaceCharacters(value) >= SEARCH_QUERY_MIN_NON_WHITESPACE_CHARS,
        { message: 'query' }
      )
      .refine((value) => countCodePoints(value) <= SEARCH_QUERY_MAX_CODE_POINTS, {
        message: 'query',
      }),
    language: languageSchema,
    page: pageSchema.default(1),
  })
  .strict()

export type AsyncHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<void>

export const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (request, response, next) => {
    void handler(request, response, next).catch(next)
  }

const respondWithValidationError = (error: z.ZodError): never => {
  const details = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
  }))
  throw validationError(details)
}

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value)
  if (!result.success) {
    return respondWithValidationError(result.error)
  }
  return result.data
}

export interface SearchController {
  readonly getSearchPage: RequestHandler
}

export const createSearchController = (service: SearchService): SearchController => {
  const getSearchPage = asyncHandler(async (request, response) => {
    const query = parse(searchQuerySchema, request.query)
    const result = await service.getSearchPage({
      query: query.query,
      language: toProviderLanguage(query.language),
      page: query.page,
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  return Object.freeze({ getSearchPage })
}
