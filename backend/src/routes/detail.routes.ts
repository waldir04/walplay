import { Router } from 'express'

import type { DetailController } from '../controllers/detail.controller.js'

export const createDetailRouter = (controller: DetailController): Router => {
  const router = Router()

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/:mediaType/titles/:itemId/detail', controller.getDetail)
  router.get('/:mediaType/titles/:itemId/credits', controller.getCredits)
  router.get('/:mediaType/titles/:itemId/similar', controller.getSimilar)
  router.get('/:mediaType/titles/:itemId/collection', controller.getCollection)
  router.get('/:mediaType/titles/:itemId/seasons/:seasonNumber', controller.getSeason)

  return router
}
