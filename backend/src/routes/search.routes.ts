import { Router } from 'express'

import type { SearchController } from '../controllers/search.controller.js'

export const createSearchRouter = (controller: SearchController): Router => {
  const router = Router()

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  router.get('/', controller.getSearchPage)

  return router
}
