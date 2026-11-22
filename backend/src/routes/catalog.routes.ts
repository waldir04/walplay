import { Router } from 'express'

import type { CatalogController } from '../controllers/catalog.controller.js'

export const createCatalogRouter = (controller: CatalogController): Router => {
  const router = Router()

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/capabilities', controller.getCapabilities)
  router.get('/:mediaType/titles/:itemId', controller.getItem)
  router.get('/:mediaType/:section', controller.getSectionPage)

  return router
}
