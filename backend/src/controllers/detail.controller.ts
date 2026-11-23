import type { RequestHandler } from 'express'
import { z } from 'zod'

import { MAX_SEASON_NUMBER, MIN_SEASON_NUMBER } from '../domain/detail.js'
import { ITEM_ID_PATTERN } from '../lib/itemId.js'
import { toProviderLanguage } from '../providers/tmdb/tmdb.language.js'
import type { DetailService } from '../services/detail.service.js'

import { asyncHandler, languageQuerySchema, parse } from './catalog.controller.js'

const mediaTypeSchema = z.enum(['movie', 'tv'])

export const detailParamsSchema = z
  .object({ mediaType: mediaTypeSchema, itemId: z.string().regex(ITEM_ID_PATTERN) })
  .strict()

export const seasonParamsSchema = z
  .object({
    mediaType: mediaTypeSchema,
    itemId: z.string().regex(ITEM_ID_PATTERN),
    seasonNumber: z.coerce
      .number()
      .int()
      .min(MIN_SEASON_NUMBER)
      .max(MAX_SEASON_NUMBER),
  })
  .strict()

export interface DetailController {
  readonly getDetail: RequestHandler
  readonly getCredits: RequestHandler
  readonly getSimilar: RequestHandler
  readonly getCollection: RequestHandler
  readonly getSeason: RequestHandler
}

export const createDetailController = (service: DetailService): DetailController => {
  const getDetail = asyncHandler(async (request, response) => {
    const params = parse(detailParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getDetail({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  const getCredits = asyncHandler(async (request, response) => {
    const params = parse(detailParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getCredits({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  const getSimilar = asyncHandler(async (request, response) => {
    const params = parse(detailParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getSimilar({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  const getCollection = asyncHandler(async (request, response) => {
    const params = parse(detailParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getCollection({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  const getSeason = asyncHandler(async (request, response) => {
    const params = parse(seasonParamsSchema, request.params)
    const query = parse(languageQuerySchema, request.query)
    const result = await service.getSeason({
      mediaType: params.mediaType,
      itemId: params.itemId,
      language: toProviderLanguage(query.language),
      seasonNumber: params.seasonNumber,
    })
    response.status(200).json({ data: result.data, meta: result.meta })
  })

  return Object.freeze({ getDetail, getCredits, getSimilar, getCollection, getSeason })
}
