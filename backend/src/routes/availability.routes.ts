import { Router } from 'express'

import type { AvailabilityController } from '../controllers/availability.controller.js'

export const createAvailabilityRouter = (controller: AvailabilityController): Router => {
  const router = Router()

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/availability/regions', controller.getRegions)
  router.get('/:mediaType/titles/:itemId/availability', controller.getAvailability)

  return router
}
