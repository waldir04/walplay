import express from 'express'
import type { Express } from 'express'

import type { BackendConfig } from './config/env.js'
import { createCatalogController } from './controllers/catalog.controller.js'
import { createSearchController } from './controllers/search.controller.js'
import { createLogger, silentLogger } from './lib/logger.js'
import type { Logger } from './lib/logger.js'
import { createCorsMiddleware } from './middleware/cors.js'
import { createErrorMiddleware, createNotFoundHandler } from './middleware/error.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { createCatalogRouter } from './routes/catalog.routes.js'
import { createSearchRouter } from './routes/search.routes.js'
import type { CatalogService } from './services/catalog.service.js'
import type { SearchService } from './services/search.service.js'

export interface CreateAppOptions {
  readonly config: BackendConfig
  readonly service: CatalogService
  readonly searchService: SearchService
  readonly logger?: Logger
}

export const createApp = ({
  config,
  service,
  searchService,
  logger,
}: CreateAppOptions): Express => {
  const app = express()
  const activeLogger =
    logger ?? (config.nodeEnv === 'test' ? silentLogger : createLogger(config.logLevel))

  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  app.use(requestIdMiddleware)
  app.use(createCorsMiddleware({ allowedOrigins: config.corsAllowedOrigins }))

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.use('/api/catalog', createCatalogRouter(createCatalogController(service)))
  app.use('/api/search', createSearchRouter(createSearchController(searchService)))

  app.use(createNotFoundHandler())
  app.use(createErrorMiddleware(activeLogger))

  return app
}
