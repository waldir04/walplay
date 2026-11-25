import type { RequestHandler } from 'express'
import { z } from 'zod'

import { notFoundError, validationError } from '../domain/errors.js'
import { ITEM_ID_PATTERN, decodeItemId } from '../lib/itemId.js'
import type { TrailerService } from '../services/trailer.service.js'

import { asyncHandler, emptyQuerySchema, parse } from './catalog.controller.js'

const mediaTypeSchema = z.enum(['movie', 'tv'])

export const trailerParamsSchema = z
  .object({ mediaType: mediaTypeSchema, itemId: z.string().regex(ITEM_ID_PATTERN) })
  .strict()

export interface TrailerController {
  readonly getTrailers: RequestHandler
}

export const createTrailerController = (service: TrailerService): TrailerController => {
  const getTrailers = asyncHandler(async (request, response) => {
    const params = parse(trailerParamsSchema, request.params)
    parse(emptyQuerySchema, request.query)

    let reference: ReturnType<typeof decodeItemId>
    try {
      reference = decodeItemId(params.itemId)
    } catch {
      throw validationError(['itemId'])
    }
    if (reference.mediaType !== params.mediaType) {
      throw notFoundError()
    }

    const result = await service.getTrailers({
      mediaType: params.mediaType,
      providerId: reference.providerId,
    })

    response.status(200).json({ data: result.data, meta: result.meta })
  })

  return Object.freeze({ getTrailers })
}
