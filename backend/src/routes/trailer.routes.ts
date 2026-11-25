import { Router } from 'express'

import type { TrailerController } from '../controllers/trailer.controller.js'

export const createTrailerRouter = (controller: TrailerController): Router => {
  const router = Router()

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/:mediaType/titles/:itemId/videos', controller.getTrailers)

  return router
}
