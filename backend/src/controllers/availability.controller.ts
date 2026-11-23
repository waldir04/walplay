import type { RequestHandler } from 'express'
import { z } from 'zod'

import { AVAILABILITY_DEFAULT_REGION } from '../domain/availability.js'
import { notFoundError, validationError } from '../domain/errors.js'
import { ITEM_ID_PATTERN, decodeItemId } from '../lib/itemId.js'
import type { AvailabilityService } from '../services/availability.service.js'

import { asyncHandler, emptyQuerySchema, parse } from './catalog.controller.js'

const mediaTypeSchema = z.enum(['movie', 'tv'])

export const availabilityParamsSchema = z
  .object({ mediaType: mediaTypeSchema, itemId: z.string().regex(ITEM_ID_PATTERN) })
  .strict()

export const availabilityQuerySchema = z
  .object({
    region: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .strict()

export interface AvailabilityController {
  readonly getAvailability: RequestHandler
  readonly getRegions: RequestHandler
}

export const createAvailabilityController = (
  service: AvailabilityService
): AvailabilityController => {
  const getAvailability = asyncHandler(async (request, response) => {
    const params = parse(availabilityParamsSchema, request.params)
    const query = parse(availabilityQuerySchema, request.query)

    let reference: ReturnType<typeof decodeItemId>
    try {
      reference = decodeItemId(params.itemId)
    } catch {
      throw validationError(['itemId'])
    }
    if (reference.mediaType !== params.mediaType) {
      throw notFoundError()
    }

    const result = await service.getAvailability({
      mediaType: params.mediaType,
      providerId: reference.providerId,
      region: query.region ?? AVAILABILITY_DEFAULT_REGION,
    })

    response.status(200).json({
      data: result.data,
      ...(result.meta === undefined ? {} : { meta: result.meta }),
    })
  })

  const getRegions = asyncHandler((request, response) => {
    parse(emptyQuerySchema, request.query)
    response.status(200).json({ data: { regions: service.getRegions() } })
    return Promise.resolve()
  })

  return Object.freeze({ getAvailability, getRegions })
}
