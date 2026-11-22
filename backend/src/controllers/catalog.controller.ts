import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { z } from 'zod'

import { validationError } from '../domain/errors.js'
import { ITEM_ID_PATTERN } from '../lib/itemId.js'
import { toProviderLanguage } from '../providers/tmdb/tmdb.language.js'
import type { CatalogService } from '../services/catalog.service.js'

const mediaTypeSchema = z.enum(['movie', 'tv'])
const sectionSchema = z.enum(['trending', 'popular', 'top-rated'])
const languageSchema = z.enum(['en', 'es'])
const pageSchema = z.coerce.number().int().min(1).max(1000)

export const sectionParamsSchema = z
  .object({ mediaType: mediaTypeSchema, section: sectionSchema })
  .strict()

export const detailParamsSchema = z
  .object({ mediaType: mediaTypeSchema, itemId: z.string().regex(ITEM_ID_PATTERN) })
  .strict()

export const languageQuerySchema = z.object({ language: languageSchema }).strict()

export const sectionQuerySchema = z
  .object({ language: languageSchema, page: pageSchema.default(1) })
  .strict()

export const emptyQuerySchema = z.object({}).strict()

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

export interface CatalogController {
  readonly getCapabilities: RequestHandler
  readonly getSectionPage: RequestHandler
  readonly getItem: RequestHandler
}

export const createCatalogController = (service: CatalogService): CatalogController => {
  const getCapabilities = asyncHandler(async (request, response) => {
    parse(emptyQuerySchema, request.query)
    const data = await service.getCapabilities()
    response.status(200).json({ data })
  })

  const getSectionPage = asyncHandler(async (request, response) => {
    const params = parse(sectionParamsSchema, request.params)
    const query = parse(sectionQuerySchema, request.query)
    const result = await service.getSectionPage({
      mediaType: params.mediaType,
      section: params.section,
      language: toProviderLanguage(query.language),
      page: query.page,
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  const getItem = asyncHandler(async (request, response) => {
    const params = parse(detailParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getItem({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  return Object.freeze({ getCapabilities, getSectionPage, getItem })
}
